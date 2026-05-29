from pathlib import Path
p=Path('app/src/main/assets/public/assets/index-BeXfh3uj.js')
bak=Path(str(p)+'.bak2')
text=p.read_text(encoding='utf-8',errors='ignore')
marker='Editar gasto'
idx=text.find(marker)
if idx==-1:
    print('marker not found')
else:
    # search backward for the Ke children before marker
    search_range_start=max(0, idx-400)
    block=text[search_range_start:idx+len(marker)+200]
    needle='children:(0,G.jsx)(Ke,{size:16})'
    rel=block.rfind(needle)
    if rel==-1:
        print('needle not found near marker')
    else:
        abs_idx=search_range_start+rel
        newpart=(needle+'}),(0,G.jsx)(`button`,{className:`btn-icon`,onClick:e=>{e.stopPropagation(),Sr(`expense`,t.id)},title:`Eliminar gasto`,style:{opacity:1,cursor:`pointer`,color:`#ef4444`},children:(0,G.jsx)(tt,{size:16})})')
        newtext=text[:abs_idx]+newpart+text[abs_idx+len(needle):]
        bak.write_text(text,encoding='utf-8')
        p.write_text(newtext,encoding='utf-8')
        print('patched at',abs_idx)
