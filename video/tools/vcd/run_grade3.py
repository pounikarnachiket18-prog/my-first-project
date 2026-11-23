import sys, subprocess, numpy as np, time
sys.path.insert(0, sys.argv[1]); from grade2 import grade_v2
src, dst = sys.argv[2], sys.argv[3]; W,H=720,1280
A, B = 805, 881  # red-alarm sleep shot
# pre-pass: masks from the truly untinted frames of the alarm shot
raw=subprocess.run(['ffmpeg','-v','error','-i',src,'-vf',f"select='between(n,{A},{B-1})'",'-vsync','0','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
shot=np.frombuffer(raw,np.uint8).reshape(-1,H,W,3)
means=[f.reshape(-1,3).astype(np.float32).mean(0) for f in shot]
clean={}
for k,(f,mu) in enumerate(zip(shot,means)):
    if mu[0]/mu[2] < 1.0:
        _,m=grade_v2(f,A+k,want_mask=True); clean[A+k]=(m,mu)
keys=sorted(clean); print('clean frames',keys,flush=True)
def nearest(n): return clean[min(keys,key=lambda c:abs(c-n))]
dec=subprocess.Popen(['ffmpeg','-v','error','-i',src,'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
enc=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r','30','-i','-','-c:v','libx264','-crf','12','-preset','medium','-pix_fmt','yuv420p',dst],stdin=subprocess.PIPE)
i=0; t0=time.time()
while True:
    b=dec.stdout.read(W*H*3)
    if len(b)<W*H*3: break
    f=np.frombuffer(b,np.uint8).reshape(H,W,3)
    if A<=i<B:
        m,mu0=nearest(i); mu=f.reshape(-1,3).astype(np.float32).mean(0)
        g=grade_v2(f,i,wb=((mu0/mu).astype(np.float32),np.zeros(3,np.float32)),mask=m)
    else:
        g=grade_v2(f,i)
    enc.stdin.write(g.tobytes()); i+=1
    if i%150==0: print(i, round(time.time()-t0,1), flush=True)
enc.stdin.close(); enc.wait(); print('done',i)
