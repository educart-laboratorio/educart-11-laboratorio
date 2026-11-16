// TC-14: contratos de cache/segurança sem deploy, sem credencial.
import assert from 'node:assert/strict';
import { reforcarCabecalhos } from '../src/lib/security/headers-resposta.ts';
const res = (initial = {}) => ({headers:new Headers(initial)});
const req = (accept='text/html', options={}) => ({
 method:options.method || 'GET', nextUrl:{protocol:options.protocol || 'https:'},
 headers:new Headers({...options.headers,accept})
});
const official=res();
reforcarCabecalhos(official,req(),true);
for(const [key,val] of [
 ['x-content-type-options','nosniff'],['referrer-policy','strict-origin-when-cross-origin'],
 ['x-frame-options','DENY'],['strict-transport-security','max-age=86400'],
 ['cache-control','private, no-cache, max-age=0, must-revalidate']
])assert.equal(official.headers.get(key),val,key);
assert.match(official.headers.get('content-security-policy'),/frame-ancestors 'none'/);
const rsc=res();
reforcarCabecalhos(rsc,req('text/x-component',{headers:{rsc:'1'}}),true);
assert.match(rsc.headers.get('cache-control'),/no-store/);
const deny=res({'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex'});
reforcarCabecalhos(deny,req(),true);
assert.equal(deny.headers.get('cache-control'),'private, no-store, max-age=0');
assert.equal(deny.headers.get('x-robots-tag'),'noindex');
const dev=res();reforcarCabecalhos(dev,req(),false);
assert.equal(dev.headers.get('strict-transport-security'),null,'HSTS nao permitido no DEV');
const http=res();reforcarCabecalhos(http,req('text/html',{protocol:'http:'}),true);
assert.equal(http.headers.get('strict-transport-security'),null);
const staticAsset=res();reforcarCabecalhos(staticAsset,req('image/avif,image/*'),true);
assert.equal(staticAsset.headers.get('cache-control'),null,'Imagem nao pode herdar cache HTML');
assert.equal(staticAsset.headers.get('content-security-policy'),null,'Sem CSP HTML para imagem');
const assetWithHeader=res({'Cache-Control':'public,max-age=31536000,immutable'});
reforcarCabecalhos(assetWithHeader,req('text/javascript'),false);
assert.equal(assetWithHeader.headers.get('cache-control'),'public,max-age=31536000,immutable');
console.log('TC14 CONTRATOS PASS: cache, HSTS, CSP, XFO e legado no-store.');
