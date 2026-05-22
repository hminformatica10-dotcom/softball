import re
path='app/src/main/assets/public/assets/index-CKHPezKN.js'
s=open(path,'r',encoding='utf-8').read()
m=re.search(r"ut=\(|function ut\b|var ut=|let ut=|const ut=",s)
if not m:
    print('not found')
else:
    pos=m.start()
    line=s.count('\n',0,pos)+1
    print('found at char',pos,'line',line)
    # print a few lines around
    lines=s.splitlines()
    start=max(0,line-10)
    end=min(len(lines),line+40)
    for i in range(start,end):
        print(f'{i+1:6d}:',lines[i])
