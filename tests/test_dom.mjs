#!/usr/bin/env node
/** UI state/DOM logic smoke tests. This harness is NOT a browser or visual QA. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const input=path.resolve(process.argv[2]||path.join(here,'../index.html'));
const tree=JSON.parse(execFileSync('python',[path.join(here,'export_dom.py'),input],{maxBuffer:16e6,encoding:'utf8'}));
const source=fs.readFileSync(path.join(here,'../source/app.js'),'utf8');
const labsSource=fs.readFileSync(path.join(here,'../source/labs.js'),'utf8');
const checks=[];
function pass(label){checks.push(label);}
function createEnvironment({denied=false,hash='',mobile=false,saved=null}={}){
  let doc;let seq=0;let nextTimer=1;const timers=new Map();const listeners={};const savedStorage=new Map();if(saved)savedStorage.set('dsa-course-state-v1',saved);
  class TextNode {
    constructor(value){this.nodeType=3;this.value=value;this.parentElement=null;this.order=seq++;}
    get textContent(){return this.value;}set textContent(v){this.value=String(v);}
  }
  function simple(el,s){
    if(!el.tagName)return false;s=s.trim();
    const not=s.match(/:not\(([^)]+)\)/);if(not){if(simple(el,not[1]))return false;s=s.replace(not[0],'');}
    const attrs=[...s.matchAll(/\[([^\]=^]+)(\^?=)?(?:"([^"]*)"|'([^']*)'|([^\]]*))?\]/g)];
    for(const a of attrs){const val=el.getAttribute(a[1]);if(val===null)return false;if(a[2]){const expected=a[3]??a[4]??a[5];if(a[2]==='='&&val!==expected)return false;if(a[2]==='^='&&!val.startsWith(expected))return false;}}
    s=s.replace(/\[[^\]]*\]/g,'');
    const id=s.match(/#([\w-]+)/);if(id&&el.id!==id[1])return false;
    for(const c of s.matchAll(/\.([\w-]+)/g))if(!el.classList.contains(c[1]))return false;
    const tag=s.match(/^[a-zA-Z][\w-]*/);if(tag&&el.tagName.toLowerCase()!==tag[0].toLowerCase())return false;
    return true;
  }
  function matches(el,s){
    const parts=s.trim().split(/\s+(?![^\[]*\])/);let cursor=el;
    if(!simple(cursor,parts.pop()))return false;
    while(parts.length){const parentSelector=parts.pop();if(parentSelector==='>'){cursor=cursor.parentElement;if(!cursor||!simple(cursor,parts.pop()))return false;continue;}
      let found=cursor.parentElement;while(found&&!simple(found,parentSelector))found=found.parentElement;if(!found)return false;cursor=found;}
    return true;
  }
  class Element {
    constructor(tag,attrs={}){this.nodeType=1;this.tagName=tag.toUpperCase();this.attrs={...attrs};this.children=[];this.parentElement=null;this.style={};this.events={};this.order=seq++;this.offsetHeight=3000;this.offsetWidth=800;this.value=this.attrs.value||'';this.inert=false;this._top=100;this._scroll=false;
      this.dataset=new Proxy({}, {get:(_,p)=>this.attrs['data-'+String(p).replace(/[A-Z]/g,m=>'-'+m.toLowerCase())],set:(_,p,v)=>{this.attrs['data-'+String(p).replace(/[A-Z]/g,m=>'-'+m.toLowerCase())]=String(v);return true;}});
      this.classList={contains:c=>(this.attrs.class||'').split(/\s+/).includes(c),add:(...cs)=>{this.attrs.class=[...new Set((this.attrs.class||'').split(/\s+/).filter(Boolean).concat(cs))].join(' ');},remove:c=>{this.attrs.class=(this.attrs.class||'').split(/\s+/).filter(x=>x!==c).join(' ');},toggle:(c,force)=>{const yes=force===undefined?!this.classList.contains(c):force;if(yes)this.classList.add(c);else this.classList.remove(c);return yes;}};
    }
    get id(){return this.attrs.id||'';}set id(v){this.attrs.id=v;}
    get className(){return this.attrs.class||'';}set className(v){this.attrs.class=v;}
    get name(){return this.attrs.name||'';}
    get hash(){return this.href.startsWith('#')?this.href:'';}
    get href(){return this.attrs.href||'';}set href(v){this.attrs.href=v;}
    get hidden(){return 'hidden'in this.attrs;}set hidden(v){if(v)this.attrs.hidden='';else delete this.attrs.hidden;}
    get disabled(){return 'disabled'in this.attrs;}set disabled(v){if(v)this.attrs.disabled='';else delete this.attrs.disabled;}
    get open(){return 'open'in this.attrs;}set open(v){if(v)this.attrs.open='';else delete this.attrs.open;}
    get offsetParent(){let e=this;while(e){if(e.hidden)return null;e=e.parentElement;}return this.parentElement||this;}
    get isContentEditable(){return false;}
    get textContent(){return this.children.map(c=>c.textContent).join('');}
    set textContent(v){this.replaceChildren(new TextNode(String(v)));}
    get innerHTML(){return this._html||'';}set innerHTML(value){this._html=String(value);this.children=[];}
    matches(s){return s.split(',').some(p=>matches(this,p));}
    get innerText(){return this.textContent;}
    setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return k in this.attrs?String(this.attrs[k]??''):null;}removeAttribute(k){delete this.attrs[k];}hasAttribute(k){return k in this.attrs;}
    append(...nodes){for(let n of nodes){if(typeof n==='string')n=new TextNode(n);n.parentElement=this;this.children.push(n);}}
    replaceChildren(...nodes){this.children=[];this.append(...nodes);}
    querySelectorAll(selector){const result=[];const selectors=selector.split(',');const walk=el=>{for(const c of el.children){if(c.nodeType!==1)continue;if(selectors.some(s=>matches(c,s)))result.push(c);walk(c);}};walk(this);return result;}
    querySelector(s){return this.querySelectorAll(s)[0]||null;}
    closest(s){let e=this;while(e){if(matches(e,s))return e;e=e.parentElement;}return null;}
    contains(other){let e=other;while(e){if(e===this)return true;e=e.parentElement;}return false;}
    addEventListener(type,fn){(this.events[type]||=[]).push(fn);}
    dispatch(type,extra={}){const ev={target:this,key:'',defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra};for(const f of this.events[type]||[])f(ev);return ev;}
    click(){if(this.disabled)return;const event=this.dispatch('click');let parent=this.parentElement;while(parent){parent.dispatch('click',{target:this});parent=parent.parentElement;}if(this.tagName==='A'&&this.href.startsWith('#')&&!event.defaultPrevented)loc.hash=this.href;return event;}
    focus(){doc.activeElement=this;}select(){}scrollIntoView(){this._scroll=true;this._top=110;}
    getBoundingClientRect(){return {top:this._top,left:0,right:800,bottom:this._top+400,width:800,height:400};}
    compareDocumentPosition(other){if(this===other)return 0;return other.order>this.order?4:2;}
    showModal(){this.open=true;}close(){this.open=false;}
  }
  function from(node){if(typeof node==='string')return new TextNode(node);const e=new Element(node.tag,node.attrs);e.append(...node.children.map(from));return e;}
  doc=from(tree);doc.documentElement=doc.querySelector('html');doc.body=doc.querySelector('body');doc.activeElement=doc.body;doc.title='';doc.getElementById=id=>doc.querySelector('#'+id);doc.createElement=tag=>new Element(tag);doc.createTextNode=t=>new TextNode(t);doc.addEventListener=(type,fn)=>{(listeners['document:'+type]||=[]).push(fn);};
  doc.createTreeWalker=root=>{const nodes=root.querySelectorAll('*');let i=0;return{nextNode:()=>nodes[i++]||null};};
  const loc={_hash:hash,get hash(){return this._hash;},set hash(v){this._hash=v.startsWith('#')?v:'#'+v;for(const fn of listeners.hashchange||[])fn();}};
  const storage={getItem:k=>savedStorage.get(k)||null,setItem:(k,v)=>savedStorage.set(k,String(v))};
  const window={document:doc,location:loc,innerHeight:900,scrollY:0,matchMedia:q=>({matches:q.includes('max-width')?mobile:false,addEventListener(){},addListener(){}}),addEventListener:(type,fn)=>{(listeners[type]||=[]).push(fn);},scrollTo:opts=>{window.scrollY=opts.top;},print:()=>{for(const f of listeners.beforeprint||[])f();for(const f of listeners.afterprint||[])f();}};
  const context={document:doc,window,location:loc,history:{scrollRestoration:'auto'},NodeFilter:{SHOW_ELEMENT:1},Node:{DOCUMENT_POSITION_FOLLOWING:4},setTimeout:(fn,delay)=>{const id=nextTimer++;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>fn(),console,Map,Set,JSON,Math,String,Number,Boolean,Object,Array};
  Object.defineProperty(context,'localStorage',{get(){if(denied)throw new Error('SecurityError: storage denied');return storage;}});
  vm.createContext(context);vm.runInContext(labsSource,context,{filename:'labs.js'});window.DSALabs=context.DSALabs;vm.runInContext(source,context,{filename:'app.js'});
  return {$:id=>doc.getElementById(id),doc,loc,window,storage:savedStorage,timers,
    runTimers(max=250){for(const [id,t]of [...timers])if(t.delay<=max){timers.delete(id);t.fn();}},
    event(type,evt={}){for(const f of listeners[type]||[])f(evt);},
    key(key){const e={key,target:doc.activeElement,preventDefault(){}};for(const f of listeners['document:keydown']||[])f(e);},
  };
}
const e=createEnvironment();const $=e.$;
assert.equal($('course-home').hidden,false);assert.equal($('reader').hidden,true);assert.equal(e.doc.body.classList.contains('no-js'),false);pass('Home route initializes with all 13 chapters in the embedded DOM');
e.loc.hash='chapter-01';assert.equal($('chapter-01').hidden,false);assert.equal($('chapter-02').hidden,true);assert.equal($('next-chapter').href,'#chapter-02');pass('Chapter route selects one article and updates navigation');
e.doc.querySelector('.skip-link').click();assert.equal(e.doc.activeElement,$('main-content'));assert.equal($('chapter-01').hidden,false);pass('Skip link focuses main without leaving the active chapter');
$('bookmark-button').click();$('complete-button').click();assert.equal($('bookmark-button').getAttribute('aria-pressed'),'true');assert.equal($('course-progress-text').textContent,'1 / 13');
const reloaded=createEnvironment({hash:'#chapter-01',saved:e.storage.get('dsa-course-state-v1')});assert.equal(reloaded.$('bookmark-button').getAttribute('aria-pressed'),'true');assert.equal(reloaded.$('complete-button').getAttribute('aria-pressed'),'true');pass('Bookmarks, completion, and resume survive a new app instance');
$('show-bookmarks').click();assert.equal($('bookmark-dialog').open,true);assert.equal($('bookmark-list').querySelectorAll('a').length,1);$('bookmark-list').querySelector('a').click();assert.equal($('bookmark-dialog').open,false);pass('Bookmark dialog links to the saved chapter');
e.key('/');assert.equal($('search-dialog').open,true);$('search-input').value='不變量';$('search-input').dispatch('input');assert.ok($('search-results').querySelectorAll('a').length>0);const result=$('search-results').querySelector('a');const href=result.href;result.click();assert.equal(e.loc.hash,href);assert.equal($('search-dialog').open,false);pass('Search finds full-text results and follows the result anchor');
$('search-button').click();$('search-input').value='zzzz不存在987654321';$('search-input').dispatch('input');assert.equal($('search-results').querySelectorAll('a').length,0);assert.ok($('search-status').textContent.includes('沒有找到'));pass('No-result search gives an explicit empty state');
$('search-input').value='<img src=x>';$('search-input').dispatch('input');assert.equal($('search-results').querySelectorAll('a').length,0);$('close-search').click();pass('Untrusted search text is treated as plain text');
$('search-button').click();$('search-input').value='binary search';$('search-input').dispatch('input');assert.equal($('search-results').querySelector('a').href,'#chapter-09');assert.ok($('search-results').querySelectorAll('a').length<$('chapter-09').querySelectorAll('h3').length);pass('English chapter aliases rank the relevant chapter without matching every subsection');
$('search-input').value='練習 join_tokens';$('search-input').dispatch('input');$('search-results').querySelector('a').click();assert.ok($('chapter-01').querySelectorAll('details').some(detail=>detail.open&&detail.textContent.includes('join_tokens')));pass('Multi-word search opens an answer when the words span its section heading and code');
$('theme-select').value='dark';$('theme-select').dispatch('change',{target:$('theme-select')});assert.equal(e.doc.documentElement.dataset.theme,'dark');pass('Theme updates document and saved preference');
e.event('beforeprint');e.event('beforeprint');assert.equal(e.doc.querySelectorAll('#chapters details:not([open])').length,0);e.event('afterprint');assert.ok(e.doc.querySelectorAll('#chapters details:not([open])').length>0);pass('Repeated beforeprint events still restore prior disclosure states');
const deep=$('chapter-11').querySelector('h3');e.loc.hash=deep.id;assert.equal($('chapter-11').hidden,false);assert.ok(deep._scroll);e.loc.hash='missing-anchor';assert.equal($('course-home').hidden,false);pass('Direct subsection anchors and unknown-anchor fallback');
const m=createEnvironment({mobile:true});m.$('menu-button').click();assert.equal(m.$('sidebar').getAttribute('aria-modal'),'true');assert.equal(m.$('main-content').inert,true);m.key('Escape');assert.equal(m.$('main-content').inert,false);assert.equal(m.$('sidebar').getAttribute('aria-modal'),null);pass('Mobile drawer locks background and releases on Escape');
m.$('menu-button').click();m.key('/');assert.equal(m.$('sidebar').classList.contains('is-open'),false);assert.equal(m.$('main-content').inert,false);assert.equal(m.doc.activeElement,m.$('search-input'));m.$('close-search').click();m.loc.hash='chapter-01';m.$('menu-button').click();m.$('sidebar').querySelector('a[href="#course-home"]').click();assert.equal(m.doc.activeElement,m.$('course-home'));pass('Mobile dialogs release the drawer and home navigation focuses visible content');
const d=createEnvironment({denied:true,hash:'#chapter-01'});d.$('bookmark-button').click();assert.equal(d.$('bookmark-button').getAttribute('aria-pressed'),'true');assert.ok(d.$('storage-note').textContent.includes('無法保存'));pass('Denied storage keeps in-memory operation and explains limitation');
const bad=createEnvironment({saved:'{broken JSON'});assert.equal(bad.$('course-home').hidden,false);pass('Corrupt local storage cannot break the app');
const filtered=createEnvironment({saved:JSON.stringify({completed:['chapter-01','chapter-01','wrong'],bookmarks:['wrong'],last:'absent',theme:'invalid'})});assert.equal(filtered.$('course-progress-text').textContent,'1 / 13');assert.equal(filtered.$('bookmark-count').textContent,'0');pass('Saved state filters duplicates, unknown chapters, and invalid themes');
for(const key of ['two-pointers','sliding-window','binary-search','bfs','backtracking','dp']){
  const lab=$('lab-'+key),act=name=>lab.querySelector(`[data-action="${name}"]`);
  assert.equal(lab.dataset.step,'0');assert.equal(act('prev').disabled,true);assert.equal(act('next').disabled,false);
  const first=lab.querySelector('.lab-explanation').textContent;act('next').click();assert.equal(lab.dataset.step,'1');assert.notEqual(lab.querySelector('.lab-explanation').textContent,first);act('prev').click();assert.equal(lab.dataset.step,'0');
  let step=0;while(!act('next').disabled && step++<500)act('next').click();assert.ok(step<500);assert.equal(lab.dataset.done,'true');assert.equal(act('next').disabled,true);act('next').click();assert.equal(lab.dataset.done,'true');act('reset').click();assert.equal(lab.dataset.step,'0');assert.equal(lab.dataset.done,'false');
  pass(`${key}: next/previous/reset, terminal state, and no advance past completion`);
}
const tp=$('lab-two-pointers');tp.querySelector('input[name="array"]').value='3, 1';tp.querySelector('form').dispatch('submit');assert.equal(tp.querySelector('.lab-error').hidden,false);assert.equal(tp.dataset.step,'0');tp.querySelector('input[name="array"]').value='1, 9';tp.querySelector('input[name="target"]').value='10';tp.querySelector('form').dispatch('submit');assert.equal(tp.querySelector('.lab-error').hidden,true);tp.querySelector('[data-action="next"]').click();assert.equal(tp.dataset.done,'true');assert.ok(tp.querySelector('.lab-explanation').textContent.includes('1 + 9'));pass('Input validation retains the prior trace, then valid input replaces it');
const bs=$('lab-binary-search');bs.querySelector('input[name="array"]').value='';bs.querySelector('form').dispatch('submit');bs.querySelector('[data-action="next"]').click();assert.equal(bs.dataset.done,'true');assert.ok(bs.querySelector('.lab-explanation').textContent.includes('lo = hi = 0'));pass('Empty binary-search array reaches a valid terminal insertion point');
const dp=$('lab-dp');dp.querySelector('input[name="coins"]').value='2';dp.querySelector('input[name="amount"]').value='3';dp.querySelector('form').dispatch('submit');while(!dp.querySelector('[data-action="next"]').disabled)dp.querySelector('[data-action="next"]').click();assert.ok(dp.querySelector('.lab-explanation').textContent.includes('不可行'));pass('DP custom impossible amount has explicit failure state');
const report={file:input,verification:'Lightweight simulated DOM and JavaScript state; not a browser, CSS layout, or accessibility audit.',checks,passed:checks.length};console.log(JSON.stringify(report,null,2));
