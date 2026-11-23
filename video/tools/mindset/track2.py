import numpy as np, subprocess, sys, json
from numpy.lib.stride_tricks import sliding_window_view as swv
SRC=sys.argv[1]; OUT=sys.argv[2]; W,H=720,1280; FPS=30
def frames(t0,t1):
    raw=subprocess.run(['ffmpeg','-v','error','-ss',f'{t0:.4f}','-i',SRC,'-t',f'{t1-t0:.4f}','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
    return np.frombuffer(raw,np.uint8).reshape(-1,H,W,3).astype(np.float32)
def gray(f): return f@np.array([0.299,0.587,0.114],np.float32)
res={}
# --- final approach: red marker lamps
def redlamps(t0,t1):
    fr=frames(t0,t1); out=[]
    for i,f in enumerate(fr):
        r,g,b=f[...,0],f[...,1],f[...,2]
        m=(r>110)&(r-g>55)&(r-b>45); m[:520]=0; m[900:]=0; m[:,:262]=0; m[:,600:]=0
        ys,xs=np.nonzero(m)
        if len(xs)<4: out.append(None); continue
        med=np.median(xs); L=xs<med-5; R=xs>med+5
        if L.sum()<2 or R.sum()<2: out.append(None); continue
        out.append([float(xs[L].mean()),float(ys[L].mean()),float(xs[R].mean()),float(ys[R].mean())])
    return out
# --- brightest blob tracker
def bright(t0,t1,x0,y0,rad=40):
    fr=frames(t0,t1); out=[]; x,y=x0,y0
    for f in fr:
        g=gray(f); xa,xb=int(max(0,x-rad)),int(min(W,x+rad)); ya,yb=int(max(0,y-rad)),int(min(H,y+rad))
        win=g[ya:yb,xa:xb]; thr=max(win.max()*0.92,150)
        ys,xs=np.nonzero(win>=thr)
        if len(xs): x,y=xa+xs.mean(),ya+ys.mean(); out.append([float(x),float(y),float(win.max())])
        else: out.append(None)
    return out
# --- template tracker
def tmpl(t0,t1,x0,y0,tw=56,th=36,search=14):
    fr=frames(t0,t1); out=[]; x,y=x0,y0
    T=gray(fr[0])[int(y-th/2):int(y+th/2),int(x-tw/2):int(x+tw/2)]
    for f in fr:
        g=gray(f); xa=int(x-tw/2-search); ya=int(y-th/2-search)
        xa2,ya2=max(0,xa),max(0,ya)
        reg=g[ya2:ya+th+2*search, xa2:xa+tw+2*search]
        if reg.shape[0]<th or reg.shape[1]<tw: out.append(None); continue
        win=swv(reg,(th,tw)); d=((win-T)**2).mean(axis=(2,3))
        iy,ix=np.unravel_index(np.argmin(d),d.shape)
        x=xa2+ix+tw/2; y=ya2+iy+th/2
        if x<tw/2+2: out.append(None); break
        out.append([float(x),float(y),float(d.min())])
        T=0.85*T+0.15*g[int(y-th/2):int(y-th/2)+th,int(x-tw/2):int(x-tw/2)+tw]
    return out
segs={'final':(37.40,44.10),'front':(6.15,8.52),'open':(0.0,2.18),'decalA':(2.22,4.22),'decalB':(29.40,32.22)}
res['final']={'t0':segs['final'][0],'pts':redlamps(*segs['final'])}
res['front']={'t0':segs['front'][0],'pts':bright(*segs['front'],380,594,30)}
res['open']={'t0':0.0,'pts':bright(0.0,2.18,346,650,30)}
res['decalA']={'t0':2.22,'pts':tmpl(2.22,4.22,66,636)}
res['decalB']={'t0':29.40,'pts':tmpl(29.40,32.22,134,660)}
json.dump(res,open(OUT,'w'))
for k,v in res.items():
    p=v['pts']; print(k,len(p),sum(1 for q in p if q is None)); 
    for i in range(0,len(p),12): print('  ',round(v['t0']+i/FPS,2),p[i] and [round(z) for z in p[i]])
