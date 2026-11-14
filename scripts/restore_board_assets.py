from pathlib import Path
from PIL import Image
import gzip,json,urllib.request,io,concurrent.futures
root=Path('board');manifest=json.loads((root/'assets-source.json').read_text(encoding='utf-8'))
posts=json.loads(gzip.decompress((root/'threads.json.gz').read_bytes()))
assert len(posts)==229
(root/'threads.json').write_text(json.dumps(posts,ensure_ascii=False),encoding='utf-8')
def recover(item):
    destination=root/item['path']
    assert destination.parent==root/'assets'
    if destination.exists():return
    destination.parent.mkdir(exist_ok=True)
    request=urllib.request.Request(item['url'],headers={'User-Agent':'Mozilla/5.0','Referer':'https://jig0u.fc2.net/'})
    with urllib.request.urlopen(request,timeout=30) as r:data=r.read()
    with Image.open(io.BytesIO(data)) as image:image.save(destination,'WEBP',quality=92,method=6)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(recover,manifest))
assert all((root/x['path']).exists() for x in manifest)
print('Preserved',len(posts),'threads and',len(manifest),'images')

compressed=root/'ads.html.gz'
if compressed.exists():(root/'ads.html').write_bytes(gzip.decompress(compressed.read_bytes()))
