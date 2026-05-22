import re
path='app/src/main/assets/public/assets/index-CKHPezKN.js'
with open(path,'r',encoding='utf-8') as f:
    s=f.read()
patterns=['function ut\b','var ut=','let ut=','const ut=','ut=\(']
for p in patterns:
    m=re.search(p,s)
    if m:
        i=m.start()
        print('FOUND',p,'at',i)
        print('\n---- CONTEXT ----\n')
        start=max(0,i-300)
        end=i+800
        print(s[start:end])
        break
else:
    print('no match')
