from pathlib import Path

path = Path(r"app\src\main\assets\public\assets\index-BeXfh3uj.js")
text = path.read_text(encoding='utf-8')
old1 = "title:ut(t.registrationDate)?`Este gasto requiere contraseña para editar`:`Editar gasto`,style:{opacity:1,cursor:`pointer`},children:ut(t.registrationDate)?(0,G.jsx)(He,{size:16,color:`#f59e0b`}):(0,G.jsx)(Ke,{size:16})}"
new1 = "title:`Editar gasto`,style:{opacity:1,cursor:`pointer`},children:(0,G.jsx)(Ke,{size:16})}"
old2 = "if((e===`payment`||e===`expense`)&&ut(t.registrationDate)){Ct({isOpen:!0,onVerified:()=>{xt({isOpen:!0,type:e,data:{...t,_authorizedEdit:!0}})}});return}xt({isOpen:!0,type:e,data:{...t}})"
new2 = "if(e===`payment`&&ut(t.registrationDate)){Ct({isOpen:!0,onVerified:()=>{xt({isOpen:!0,type:e,data:{...t,_authorizedEdit:!0}})}});return}xt({isOpen:!0,type:e,data:{...t}})"
count1 = text.count(old1)
count2 = text.count(old2)
if count1 != 1 or count2 != 1:
    raise SystemExit(f'Expected 1 occurrence each, found {count1} and {count2}')
text = text.replace(old1, new1, 1)
text = text.replace(old2, new2, 1)
path.write_text(text, encoding='utf-8')
print('patched1', count1)
print('patched2', count2)
