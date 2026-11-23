import sys, subprocess, numpy as np, time
sys.path.insert(0, sys.argv[1]); from grade import grade
src, dst = sys.argv[2], sys.argv[3]; W,H=720,1280
dec=subprocess.Popen(['ffmpeg','-v','error','-i',src,'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
enc=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r','30','-i','-','-c:v','libx264','-crf','12','-preset','medium','-pix_fmt','yuv420p',dst],stdin=subprocess.PIPE)
i=0; t0=time.time()
def stats(f): return f.reshape(-1,3).mean(0)/255.0
pre=subprocess.run(['ffmpeg','-v','error','-i',src,'-vf','select=eq(n\\,835)','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
ref=stats(np.frombuffer(pre,np.uint8).reshape(H,W,3).astype(np.float32))
def fit_wb(f):
    return (ref/stats(f.astype(np.float32))).astype(np.float32), np.zeros(3,np.float32)
while True:
    b=dec.stdout.read(W*H*3)
    if len(b)<W*H*3: break
    f=np.frombuffer(b,np.uint8).reshape(H,W,3)
    g,_=grade(f,i/30,fit_wb(f) if 805<=i<881 else None); enc.stdin.write(g.tobytes()); i+=1
    if i%150==0: print(i, round(time.time()-t0,1), flush=True)
enc.stdin.close(); enc.wait(); print('done',i)
