from pathlib import Path
p=Path('app/src/main/assets/public/assets/index-BeXfh3uj.js')
bak=Path(str(p)+'.bak')
text=p.read_text(encoding='utf-8',errors='ignore')
needle='children:(0,G.jsx)(Ke,{size:16})'
if needle not in text:
    print('needle not found')
else:
    newpart=(needle+'}),(0,G.jsx)(`button`,{className:`btn-icon`,onClick:e=>{e.stopPropagation(),Sr(`expense`,t.id)},title:`Eliminar gasto`,style:{opacity:1,cursor:`pointer`,color:`#ef4444`},children:(0,G.jsx)(tt,{size:16})})')
    newtext=text.replace(needle,newpart,1)
    bak.write_text(text,encoding='utf-8')
    p.write_text(newtext,encoding='utf-8')
    print('patched')
