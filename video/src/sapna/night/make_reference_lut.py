import sys, numpy as np
N=33
def hexc(h): return np.array([int(h[i:i+2],16) for i in (1,3,5)])/255.0
# luminance -> reference palette (navy darks, cream highlights)
stops=[(0.00,'#15130f'),(0.10,'#2b1f15'),(0.22,'#5a3c24'),(0.36,'#8a6a46'),(0.52,'#c6ac84'),(0.70,'#dcccad'),(0.85,'#ece2cf'),(1.00,'#fbf6ea')]
xs=np.array([s[0] for s in stops]); cs=np.array([hexc(s[1]) for s in stops])
def grad(L): return np.stack([np.interp(L,xs,cs[:,i]) for i in range(3)],-1)
def ss(a,b,x): t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
g=np.linspace(0,1,N)
b,gg,r=np.meshgrid(g,g,g,indexing='ij')  # .cube order: r fastest
rgb=np.stack([r,gg,b],-1)
mx=rgb.max(-1); mn=rgb.min(-1); d=mx-mn+1e-9
s=np.where(mx>0,d/(mx+1e-9),0)
R,G,B=rgb[...,0],rgb[...,1],rgb[...,2]
h=np.where(mx==R,((G-B)/d)%6,np.where(mx==G,(B-R)/d+2,(R-G)/d+4))*60
L=0.2126*R+0.7152*G+0.0722*B
base=grad(np.clip(np.power(L,0.72)*1.05,0,1))
# accent colours by source hue
gold=hexc('#ec4651'); red=hexc('#e23a46'); navy=hexc('#1f4a9a')
def hw(c,w): dh=np.abs(((h-c)+180)%360-180); return 1-ss(w*0.6,w,dh)
wy=hw(50,32)            # yellow/amber -> warm tan-gold
wr=np.maximum(hw(345,40),hw(15,22))  # pink/red/orange -> red
wg=hw(130,50)  # green -> navy
blue=hw(220,55)
acc_w=ss(0.30,0.55,s)*ss(0.12,0.3,mx)*(1-blue)
tot=wy+wr+wg+1e-9
acc=(gold*wy[...,None]+red*wr[...,None]+navy*wg[...,None])/tot[...,None]
acc=acc*np.clip(mx/0.8,0.45,1.25)[...,None]
out=base*(1-acc_w[...,None])+acc*acc_w[...,None]
# keep a hint of saturated blue beams as navy-cyan
bw=ss(0.35,0.6,s)*blue*ss(0.35,0.7,mx)
out=out*(1-0.75*bw[...,None])+hexc('#2a5bb8')*np.clip(mx*1.2,0,1)[...,None]*0.75*bw[...,None]
out=np.clip(out,0,1)
with open(sys.argv[1],'w') as f:
    f.write('TITLE "reference warm navy"\nLUT_3D_SIZE %d\n'%N)
    for row in out.reshape(-1,3): f.write('%.5f %.5f %.5f\n'%tuple(row))
