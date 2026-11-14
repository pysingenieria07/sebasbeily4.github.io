# Etalonaje común: todas las fotos y renders pasan por la misma curva para que compartan luz.
# Menos saturación, sombras hacia negro cálido, luces hacia marfil, y contraste de película.
import numpy as np, os, sys
from PIL import Image, ImageFilter
SRC='assets'; OUT=sys.argv[1]
M={ '4.jpg':'casa-blanca','WhatsApp-Image-2023-09-27-at-2.25.23-PM.jpg':'casa-esquinera','WhatsApp-Image-2023-09-27-at-2.46.24-PM.jpg':'oficina',
'WhatsApp-Image-2023-09-27-at-3.55.20-PM.jpg':'render-comercial','WhatsApp-Image-2023-09-27-at-4.53.15-PM.jpg':'render-plaza','WhatsApp-Image-2023-09-27-at-4.53.16-PM.jpg':'render-plaza-2',
'WhatsApp-Image-2024-02-21-at-3.31.47-PM.jpg':'obra-via','WhatsApp-Image-2024-02-21-at-3.35.55-PM.jpg':'obra-tuberia','WhatsApp-Image-2024-02-21-at-3.44.37-PM.jpg':'obra-pozo',
'WhatsApp-Image-2024-02-28-at-4.38.08-PM.jpg':'render-edificio','WhatsApp-Image-2024-02-28-at-4.39.24-PM.jpg':'render-edificio-2','WhatsApp-Image-2024-02-28-at-9.45.22-AM.jpg':'aerea-loteo',
'WhatsApp-Image-2024-02-28-at-9.45.24-AM.jpg':'aerea-loteo-2','WhatsApp-Image-2024-02-29-at-5.00.24-PM.jpg':'render-torre','WhatsApp-Image-2024-02-29-at-5.00.25-PM-1.jpg':'render-torre-2',
'WhatsApp-Image-2024-02-29-at-5.00.25-PM.jpg':'render-torre-vertical','WhatsApp-Image-2024-03-04-at-10.23.17-AM.jpg':'calle-casas','WhatsApp-Image-2024-03-04-at-10.23.36-AM-1.jpg':'casa-amarilla',
'image-6.png':'aerea-vias','image-7.png':'aerea-noche'}
SOMBRA=np.array([22,17,12])/255; LUZ=np.array([247,236,212])/255
def grade(im, sat=0.42, tinte=0.5, expo=0.9):
    a=np.asarray(im.convert('RGB')).astype(np.float32)/255
    a=a**1.06*expo
    y=(a*[0.2126,0.7152,0.0722]).sum(-1,keepdims=True)
    a=y+(a-y)*sat                                   # menos color propio
    yc=np.clip(y,0,1); s=yc*yc*(3-2*yc)             # curva en S
    tono=SOMBRA+(LUZ-SOMBRA)*s                      # sombra cálida -> luz marfil
    a=a*(1-tinte)+tono*tinte
    y2=(a*[0.2126,0.7152,0.0722]).sum(-1,keepdims=True)
    a=a+(s*0.94+0.015-y2)*0.55                      # contraste, con negros apenas levantados
    h,w=a.shape[:2]; yy,xx=np.mgrid[0:h,0:w]
    r=np.hypot((xx-w/2)/(w/2),(yy-h/2)/(h/2)); a*=(1-0.16*np.clip(r-0.55,0,1)**1.6)[...,None]   # viñeta leve
    return Image.fromarray((np.clip(a,0,1)*255+0.5).astype(np.uint8))
os.makedirs(OUT,exist_ok=True)
for f,n in M.items():
    im=Image.open(os.path.join(SRC,f)).convert('RGB')
    if f.startswith('image-'): im=im.crop((14,14,im.width-14,im.height-14))
    g=grade(im, sat=0.38 if n=='aerea-noche' else 0.42, tinte=0.52 if n=='aerea-noche' else 0.5, expo=1.05 if n=='aerea-noche' else 0.9)
    for w,suf in ((1600,''),(800,'-800')):
        j=g.copy()
        if j.width>w: j=j.resize((w,round(j.height*w/j.width)),Image.LANCZOS)
        j.save(f'{OUT}/{n}{suf}.webp','WEBP',quality=80,method=6)
