import numpy as np, subprocess, wave, json, sys
SR=48000; TEMPO=1.17
src=sys.argv[1]; out=sys.argv[2]
raw=subprocess.run(['ffmpeg','-v','error','-i',src,'-af',f'highpass=f=80,atempo={TEMPO}','-ar',str(SR),'-ac','1','-f','f32le','-'],capture_output=True).stdout
x=np.frombuffer(raw,np.float32).copy()
raw1=subprocess.run(['ffmpeg','-v','error','-i',src,'-af','highpass=f=80','-ar',str(SR),'-ac','1','-f','f32le','-'],capture_output=True).stdout
x1=np.frombuffer(raw1,np.float32).copy()
# per-line fixes: {index: (tempo, gain_dB)} - the whispered "neend aa jaaye?" is ~9 dB quiet
FIX={3:(1.0,9.0)}
# speech segments (original timeline) from silence detection, matched to script lines
seg=[(0.0,1.76),(2.43,4.56),(5.04,7.09),(7.46,8.21),(8.67,10.07),(10.48,14.10),(14.49,15.90),(16.30,17.60),
     (17.99,20.63),(21.13,24.04),(24.47,27.24),(27.54,28.35),(28.87,30.27),(30.69,32.08),(32.56,33.53),(34.03,36.11),
     (36.52,38.90),(39.34,42.86),(43.28,44.64),(44.93,45.72),(46.07,47.88),(48.24,48.92),(49.37,52.11)]
names=["Raat ke teen baje","Train ek sau das...","Aur agar loco pilot Abhi ko","neend aa jaaye?","Toh kya train bekaabu","Bilkul nahi! ...khaas system",
       "Vigilance Control Device","Yaani Dead Man Switch","Ye check karta hai...","Pilot ko har ek minute...","speed badalna, brake, horn","ya button dabana",
       "Lekin agar pilot so gaya","toh pehle ek light jalti hai","phir buzzer bajta hai","Aur kuch second tak...","toh system khud emergency brake",
       "Aur isiliye... Nachi","Kyunki insaan so sakta hai","system nahi!","Matlab train har minute poochhti hai","Jaag rahe ho?","Comment karo... follow karo!"]
# where each line should land in the video (scene cuts / on-screen captions)
anchor=[0.25,2.25,4.30,0,6.30,7.90,11.00,12.60,13.80,16.30,18.90,0,22.40,24.40,25.80,26.90,29.40,32.30,34.85,0,37.50,40.30,41.20]
GAP=0.07; PAD=0.04
track=np.zeros(int(SR*44.1),np.float32); t=0.0; plan=[]
for k,((a,b),anc,nm) in enumerate(zip(seg,anchor,names)):
    tp,gdb=FIX.get(k,(TEMPO,0.0))
    srcx=x if tp==TEMPO else x1
    a2=max(0,a/tp-PAD); b2=b/tp+PAD
    clip=srcx[int(a2*SR):int(b2*SR)].copy()*(10**(gdb/20))
    n=len(clip); f=int(0.012*SR); env=np.ones(n,np.float32); env[:f]=np.linspace(0,1,f); env[-f:]=np.linspace(1,0,f); clip*=env
    start=max(anc,t+GAP) if anc else t+0.06
    i=int(start*SR); track[i:i+n]+=clip[:max(0,len(track)-i)]
    t=start+n/SR; plan.append((nm,round(start,2),round(t,2)))
for p in plan: print(f"{p[1]:6.2f}-{p[2]:6.2f}  {p[0]}")
print('ends at',round(t,2))
w=wave.open(out,'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(track,-1,1)*32767).astype('<i2').tobytes()); w.close()
