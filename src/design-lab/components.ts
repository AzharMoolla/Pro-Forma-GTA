// Original SVG artwork. Metres are the common drawing coordinates; y=0 is ground.
// This lab has no dependency on financial inputs or production rendering.
export type Skin = 'watercolour' | 'blueprint'
export interface Piece { id: string; name: string; size: string; trigger: string; note: string; width: number; height: number; draw: (p: Palette, height?: number) => string }
interface Palette { ink: string; paper: string; wall: string; shade: string; roof: string; glass: string; green: string; foliage: string; warm: string; road: string; water: string; fine: string; shadow: string; sheen: string; brick: string; glassShade: string; spandrel: string }
export const palettes: Record<Skin, Palette> = {
  watercolour: { ink:'#526065',paper:'#faf8f1',wall:'#e9e6da',shade:'#d6d8d1',roof:'#a7b2ad',glass:'#c3d8de',green:'#6c8261',foliage:'#c5d0ad',warm:'#c8a586',road:'#deddd6',water:'#b4d3d8',fine:'#9da5a0',shadow:'#3f4a4e',sheen:'#ffffff',brick:'#d9b9a3',glassShade:'#a9c3cb',spandrel:'#93a6aa' },
  blueprint: { ink:'#e1edf0',paper:'#123958',wall:'#1d4662',shade:'#163d58',roof:'#426b80',glass:'#376781',green:'#9dbcb5',foliage:'#29596a',warm:'#839fac',road:'#1a405b',water:'#285b78',fine:'#7395ab',shadow:'#061d30',sheen:'#bfe0ee',brick:'#244e69',glassShade:'#2b5670',spandrel:'#24506a' },
}
const path = (d: string, fill: string, stroke: string, width=.075, extra='') => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`
const rect = (x:number,y:number,w:number,h:number,fill:string,stroke='none',sw=.065,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`
const line = (x:number,y:number,x2:number,y2:number,c:string,w=.06,extra='') => `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${extra}/>`
const circle = (x:number,y:number,r:number,fill:string,stroke='none',w=.06) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`
const wash=(x:number,y:number,w:number,h:number,p:Palette)=>rect(x,y,w,h,'url(#WASH)', 'none',0,`opacity="${p.paper==='#123958'?'.13':'.4'}"`)
/** A closed top plane follows exactly the same shallow projection as the side wall. */
function roofPlane(p:Palette,x:number,y:number,w:number,depth=1.7,rise=.95){
  const plane=`M${x},${y} l${depth},${-rise} h${w} l${-depth},${rise} Z`
  let s=`<g data-feature="closed-roof">`+path(plane,p.roof,p.ink,.075)+path(plane,'url(#ROOF-HATCH)','none')
  // Inset parapet line, seam and small drain marks: a generic roof finish, not equipment/design assumptions.
  s+=path(`M${x+.45},${y-.12} l${depth-.45},${-rise+.27} h${w-.8} M${x+w-.35},${y-.13} l${depth-.35},${-rise+.25}`,'none',p.ink,.045)
  for(let i=2;i<w-1;i+=3.2)s+=line(x+i,y-.06,x+i+depth-.2,y-rise+.12,p.fine,.035)
  s+=line(x,y,x+w,y,p.ink,.1)+`</g>`
  return s
}
// ---- Shared drawing rules (pilot): one oblique projection, light from the upper left, three line weights.
const RISE = .56 // every side wall and roof rises .56 m per metre of depth, so pieces line up in a street
const LW = { outline: .13, edge: .075, detail: .045, fine: .03 }
const shade = (x:number,y:number,w:number,h:number,p:Palette,o=.18) => rect(x,y,w,h,p.shadow,'none',0,`opacity="${o}"`)
/** Side wall from yBottom up to yTop at x, receding `depth` metres; darker than the lit front. */
function sideWall(p:Palette,x:number,yBottom:number,yTop:number,depth:number,fill=p.shade){
  const d=`M${x},${yBottom} V${yTop} l${depth},${-depth*RISE} V${yBottom-(depth*RISE)} Z`
  return path(d,fill,p.ink,LW.edge)+path(d,'url(#HATCH)','none')+path(d,p.shadow,'none',0,'opacity=".12"')
}
/** Soft contact shadow so the block sits on the ground instead of floating. */
const groundShadow = (w:number,depth:number,p:Palette) => path(`M-.15,0 H${w+depth} l-.35,.32 H.25 Z`,p.shadow,'none',0,'opacity=".22"')
/** A window with a reveal (shadow on the top and left inner edges), a sill and a glass sheen. */
function pane(x:number,y:number,w:number,h:number,p:Palette,mullion=true,sill=true){
  return rect(x,y,w,h,p.glass,p.ink,LW.detail)
    +path(`M${x},${y} h${w} v.13 h${-w+.13} V${y+h} h-.13 Z`,p.shadow,'none',0,'opacity=".3"')
    +line(x+(w*.25),y+h-.12,x+(w*.75),y+.18,p.sheen,.05,'opacity=".7"')
    +(mullion ? line(x+(w/2),y,x+(w/2),y+h,p.fine,LW.fine) : '')
    +(sill ? rect(x-.08,y+h,w+.16,.11,p.wall,p.ink,LW.fine) : '')
}

function building(p:Palette,height=40,podium=false){
  const w=15, depth=1.7, base=podium?5.5:3.1
  const crown=height>=18 ? 3 : 0 // top storey set back: an amenity floor and roof terrace, so towers read as towers
  const bodyTop=-height+crown
  const floors=Math.max(1,Math.floor((height-crown-base)/3))
  // Envelope first: the scale check measures this rectangle
  let s=rect(0,-height,w,height,'none','none',0,'data-envelope="height"')+groundShadow(w,depth,p)
  s+=sideWall(p,w,0,bodyTop,depth)
  s+=rect(0,bodyTop,w,height-crown,p.wall,'none',0)+wash(0,bodyTop,w,height-crown,p)+rect(0,bodyTop,w,height-crown,'url(#PANEL)','none',0)
  s+=rect(0,bodyTop,w,height-crown,p.wall,'none',0,'filter="url(#GRAIN)" opacity=".045"')
  // Recessed balcony stack at the corner: depth on the facade without inventing a design
  s+=rect(11.9,bodyTop+.4,2.8,height-crown-base-.4,p.shade,'none',0)+shade(11.9,bodyTop+.4,.35,height-crown-base-.4,p,.35)
  for(let i=0;i<floors;i++){
    const y=-base-((i+1)*3)
    s+=line(0,y+2.95,11.9,y+2.95,p.fine,LW.fine)
    for(let c=0;c<4;c++)s+=pane(1.1+(c*2.6),y+.55,1.25,1.6,p)
    // projecting balcony at the corner stack: slab, glass guard, shadow beneath
    s+=pane(12.5,y+.45,1.6,1.9,p,false)+shade(11.9,y+2.62,3,.32,p,.28)+rect(11.75,y+2.48,3.3,.14,p.wall,p.ink,LW.edge)+rect(11.75,y+1.95,3.3,.53,p.glass,p.ink,LW.fine,'fill-opacity=".45"')
  }
  s+=rect(0,bodyTop,w,height-crown,'none',p.ink,LW.outline)
  // Cornice with its shadow, then the terrace roof behind the crown
  s+=shade(0,bodyTop+.22,w,.3,p,.25)+rect(-.14,bodyTop,w+.28,.22,p.wall,p.ink,LW.edge)+roofPlane(p,-.14,bodyTop,w+.28,depth,depth*RISE)
  if(crown){
    const cx=1.4, cw=w-2.8
    s+=sideWall(p,cx+cw,bodyTop,-height,depth*.8)+rect(cx,-height,cw,crown,p.wall,p.ink,LW.outline)
    s+=rect(cx+.4,-height+.55,6.4,1.75,p.glass,p.ink,LW.detail)+line(cx+.4,-height+1.1,cx+6.8,-height+1.1,p.sheen,.04,'opacity=".6"')
    for(let x=cx+2;x<cx+6.8;x+=1.6)s+=line(x,-height+.55,x,-height+2.3,p.fine,LW.fine)
    s+=rect(cx+7.3,-height+.45,cw-7.7,2.1,p.shade,p.ink,LW.detail)
    for(let y=-height+.7;y<-height+2.5;y+=.25)s+=line(cx+7.45,y,cx+cw-.55,y,p.fine,LW.fine)
    s+=shade(cx,-height+.2,cw,.25,p,.22)+roofPlane(p,cx-.1,-height,cw+.2,depth*.8,depth*.8*RISE)
  }
  // Ground floor: lobby glazing, entrance canopy with its shadow
  s+=rect(.5,-base+.35,14,base-.35,p.shade,p.ink,LW.detail)
  for(let i=0;i<7;i++)s+=pane(.66+(i*1.95),-base+.55,1.72,base-.75,p,false)
  s+=rect(6.55,-2.55,1.8,2.55,p.glass,p.ink,LW.edge)+line(7.45,-2.5,7.45,0,p.ink,LW.detail)+circle(7.62,-1.25,.045,p.ink)
  if(podium){
    s+=`<g transform="translate(-.8)">${podiumBase(p,'retail')}</g>`
    s+=greenRoof(p,15,-height-.4)
  }else s+=shade(5.6,-2.55,3.75,.3,p,.3)+path('M5.6,-2.9 h3.75 l.35,.35 H5.25Z',p.roof,p.ink,LW.edge)+rect(.65,-.55,1.35,.55,p.wall,p.ink,LW.detail)+path('M.8,-.55 q.2,-.65 .35,0 q.2,-.8 .4,0','none',p.green,.07)
  return s+line(-.3,0,w+depth+.3,0,p.ink,LW.outline)
}

function greenRoof(p:Palette,w:number,y:number){
  let s=rect(.25,y-.02,w-.5,.22,p.shade,p.ink,LW.detail)+rect(.25,y+.2,w-.5,.08,p.shadow,'none',0,'opacity=".2"')+rect(.35,y-.13,w-.7,.23,p.green)
  for(let i=0;i<Math.floor(w*2);i++){const x=.45+(i*.46), t=i%5===2?1.35:1;s+=path(`M${x},${y} q${-.12*t},${-.5*t} .13,${-.6*t} q.26,.1 .12,${.6*t}`,p.foliage,p.green,.035)}
  return s
}
function townhouses(p:Palette,bays=4){
  const height=9, gable=1.7, end=(bays*4.4)-.1, depth=1.1
  const doors=[p.warm,p.green,p.roof,p.warm]
  let s=groundShadow(end,depth,p)
  // End wall with its gable, drawn before the front bays
  s+=sideWall(p,end,0,-height,depth)
  for(let i=0;i<bays;i++){
    const x=i*4.4
    s+=`<g data-feature="townhouse-bay">`
    // Right roof slope receding from the ridge (front-facing gable), drawn before this bay's front
    s+=path(`M${x+2.15},${-height-gable-.18} L${x+4.6},${-height+.05} l${depth},${-depth*RISE} L${x+2.15+depth},${-height-gable-.18-(depth*RISE)} Z`,p.roof,p.ink,LW.edge)+path(`M${x+2.15},${-height-gable-.18} L${x+4.6},${-height+.05} l${depth},${-depth*RISE} L${x+2.15+depth},${-height-gable-.18-(depth*RISE)} Z`,'url(#ROOF-HATCH)','none')
    // Brick front, a front-facing gable and a slate roof edge
    s+=rect(x,-height,4.3,height,p.brick,'none',0)+rect(x,-height,4.3,height,'url(#BRICK)','none',0)+wash(x,-height,4.3,height,p)
    s+=path(`M${x-.1},${-height} L${x+2.15},${-height-gable} L${x+4.4},${-height} Z`,p.brick,p.ink,LW.edge)+path(`M${x-.1},${-height} L${x+2.15},${-height-gable} L${x+4.4},${-height} Z`,'url(#BRICK)','none')
    s+=path(`M${x-.3},${-height+.05} L${x+2.15},${-height-gable-.18} L${x+4.6},${-height+.05}`,'none',p.roof,.22)+path(`M${x-.3},${-height+.05} L${x+2.15},${-height-gable-.18} L${x+4.6},${-height+.05}`,'none',p.ink,LW.edge)
    s+=circle(x+2.15,-height-.65,.32,p.glass,p.ink,LW.detail)
    // Upper floors: two windows with stone lintels; ground floor: a bay window
    for(const yy of [-7.85,-5.15])for(const xx of [x+.55,x+2.45]){s+=rect(xx-.1,yy-.22,1.25,.2,p.wall,p.ink,LW.fine)+pane(xx,yy,1.05,1.4,p)}
    s+=sideWall(p,x+1.55,-.9,-3.05,.35)+rect(x+.25,-3.05,1.3,2.15,p.wall,p.ink,LW.edge)+pane(x+.4,-2.85,1,1.6,p,false)+roofPlane(p,x+.2,-3.05,1.4,.35,.35*RISE)
    // Recessed door with a canopy shadow, transom, and a three-step stoop
    s+=rect(x+2.2,-2.75,1.4,2.45,p.shadow,'none',0,'opacity=".35"')+rect(x+2.35,-2.6,1.1,2.3,doors[i%doors.length]!,p.ink,LW.edge)
    s+=rect(x+2.5,-2.45,.8,.45,p.glass,p.ink,LW.fine)+circle(x+3.3,-1.35,.05,p.ink)
    s+=shade(x+2.1,-2.75,1.6,.22,p,.3)+path(`M${x+2.0},-2.95 l.2,-.2 h1.4 l.2,.2Z`,p.roof,p.ink,LW.detail)
    s+=path(`M${x+2.1},0 v-.1 h.1 v-.1 h.1 v-.1 h1.2 v.1 h.1 v.1 h.1 V0Z`,p.wall,p.ink,LW.detail)
    s+=rect(x,-height,4.3,height,'none',p.ink,LW.outline)+`</g>`
  }
  return s+line(-.2,0,end+depth+.2,0,p.ink,LW.outline)
}

function tree(p:Palette,x=3.2,y=0,k=1,variant=0){
  const shapes=[
    'M0,-4.6 C-2.6,-4.1 -3.7,-5.9 -2.7,-7.1 C-3.5,-8.3 -1.7,-9.5 -.6,-9.1 C.1,-10.3 2.5,-9.7 2.5,-8.4 C4,-8.1 3.3,-5.8 2.1,-5.5 C2.2,-4.6 1,-4.1 0,-4.6 Z',
    'M0,-2.9 C-1.4,-2.8 -2,-4.1 -1.3,-5.2 C-2,-6.2 -.8,-7.1 -.9,-8 C-1,-9.9 .1,-10.5 .8,-9.4 C1.5,-8.5 1,-7.5 1.5,-6.6 C2.2,-5.6 1.4,-4.6 1.5,-3.9 C1.4,-3 .7,-2.7 0,-2.9 Z',
    'M0,-3.7 C-1.5,-3.2 -3,-4.1 -2.6,-5.5 C-3.7,-6.2 -2.8,-7.6 -1.9,-7.8 C-1.6,-9.7 .4,-9.6 1,-8.6 C2.7,-9 3.1,-7.5 2.5,-6.8 C3.4,-5.3 1.9,-4.6 1.7,-4.1 C1.2,-3.5 .6,-3.4 0,-3.7 Z',
  ]
  const shape=shapes[variant%3]!
  let leaves=''
  for(let i=0;i<18;i++){
    const a=i*2.399, radius=variant===1?.7:2, xx=(variant===1?.25:0)+Math.cos(a)*radius*(.3+((i%4)*.19)), yy=-6.5+(Math.sin(a)*(variant===1?2.3:1.7))
    leaves+=path(`M${xx},${yy} q.18,-.3 .4,-.12 q.23,.08 .27,.3`,'none',p.green,.035,'opacity=".55"')
  }
  return `<g data-feature="tree-${variant%3}" transform="translate(${x} ${y}) scale(${k})">`+`<ellipse cx=".4" cy=".03" rx="${variant===1?1.1:1.9}" ry=".16" fill="${p.shadow}" opacity=".2"/>`+
    path('M-.12,0 L-.16,-4.7 L.1,-4.9 L.15,0',p.warm,p.ink,.065)+
    path(shape,p.foliage,p.green,.085)+path(shape,'url(#LEAF-WASH)','none',0)+path(shape,p.sheen,'none',0,'opacity=".22" transform="translate(-.3 -.75) scale(.86)"')+leaves+
    path(variant===1?'M-.5,-6.4 q.3,-.5 .7,-.2 M0,-8.2 q.2,-.4 .5,0 M-.5,-4.4 q.5,.3 1,-.2':'M-2.3,-6.4 q.6,-.6 1.4,-.3 M.6,-8.4 q.8,-.5 1.3,.2 M-.8,-5.3 q1,.6 1.9,-.2','none',p.green,.04)+
    path('M0,-3.2 l-.8,-1.5 M0,-3.7 l1,-1.8','none',p.ink,.05)+`</g>`
}
function person(p:Palette,x:number,y=0,variant=0){
  const step=variant%2===0
  return `<g data-feature="figure" transform="translate(${x} ${y})">`+`<ellipse cx=".04" cy=".02" rx=".36" ry=".07" fill="${p.shadow}" opacity=".22"/>`+
    path(step?'M-.12,-.79 Q0,-.82 .1,-.76 L.24,-.17 Q.26,-.11 .38,-.09 L.39,-.02 H.19 L-.02,-.57 L-.17,-.11 H-.07 V-.02 H-.32 Q-.35,-.06 -.29,-.18 Z':'M-.12,-.79 H.13 L.13,-.15 Q.14,-.1 .25,-.08 V-.02 H.02 L-.02,-.55 L-.1,-.12 L-.03,-.08 V-.02 H-.29 L-.27,-.13 Z',p.ink,p.ink,.018)+
    path('M-.11,-1.37 Q0,-1.42 .13,-1.36 Q.18,-1.32 .18,-1.19 L.16,-.78 Q0,-.72 -.16,-.78 L-.17,-1.2 Q-.18,-1.32 -.11,-1.37Z',step?p.glass:p.shade,p.ink,.025)+
    path('M-.11,-1.36 Q-.2,-1.35 -.23,-1.19 L-.28,-1.01 L-.18,-.97 L-.1,-1.21 M.12,-1.36 Q.21,-1.34 .24,-1.2 L.29,-1.01 L.2,-.97 L.11,-1.22',step?p.glass:p.shade,p.ink,.025)+
    path('M-.27,-1.01 Q-.3,-.9 -.25,-.8 L-.19,-.82 L-.2,-.98 Z M.2,-.98 L.22,-.82 L.28,-.82 Q.31,-.92 .29,-1.01 Z',p.warm,p.ink,.018)+
    circle(-.22,-.79,.048,p.warm,p.ink,.015)+circle(.25,-.79,.048,p.warm,p.ink,.015)+
    rect(-.045,-1.47,.09,.13,p.warm)+path('M-.065,-1.36 L0,-1.28 L.065,-1.36','none',p.paper,.022)+line(0,-1.26,0,-.85,p.fine,.015)+
    circle(0,-1.59,.115,p.warm,p.ink,.02)+path('M-.112,-1.61 Q-.09,-1.76 .04,-1.72 Q.13,-1.69 .11,-1.6 L.07,-1.65 Q-.02,-1.61 -.112,-1.61Z',p.ink,'none')+`</g>`
}
function wheelchair(p:Palette,x=0){return `<g data-feature="wheelchair-figure" transform="translate(${x})">`+`<ellipse cx=".3" cy=".02" rx=".85" ry=".07" fill="${p.shadow}" opacity=".22"/>`+
  circle(0,-.42,.4,'none',p.ink,.04)+circle(0,-.42,.33,'none',p.fine,.018)+circle(0,-.42,.045,p.ink)+circle(.73,-.12,.1,'none',p.ink,.03)+
  path('M-.25,-1.02 v.67 h.76 l.19,.23 h.2 M-.16,-.9 h.63 M-.17,-.65 h.64','none',p.ink,.04)+
  path('M-.07,-1.29 Q.08,-1.4 .26,-1.26 L.31,-.77 Q.13,-.69 -.07,-.75Z',p.glass,p.ink,.025)+
  path('M.01,-.75 H.49 Q.57,-.75 .6,-.64 L.77,-.23 H.62 L.43,-.57 H.05Z',p.ink,p.ink,.02)+path('M.61,-.25 h.18 l.08,.08 H.63Z',p.ink,p.ink,.015)+
  rect(.08,-1.46,.09,.15,p.warm)+circle(.12,-1.57,.115,p.warm,p.ink,.02)+path('M.01,-1.59 Q.05,-1.74 .17,-1.69 L.23,-1.62 L.16,-1.62Z',p.ink,'none')+
  path('M.2,-1.29 Q.34,-1.3 .39,-1.16 L.43,-1.08 L.32,-1.02 L.19,-1.18Z',p.glass,p.ink,.02)+
  path('M.4,-1.13 Q.54,-1.04 .51,-.98 Q.49,-.93 .18,-.86 L.14,-.92 L.4,-1.02 L.32,-1.07Z',p.warm,p.ink,.018)+circle(.14,-.88,.045,p.warm,p.ink,.015)+`</g>`}
function bench(p:Palette,x=0){return `<g transform="translate(${x})">`+`<ellipse cx=".95" cy=".02" rx="1.05" ry=".08" fill="${p.shadow}" opacity=".22"/>`+rect(0,-.62,1.8,.13,p.warm,p.ink,.045)+rect(.05,-1.12,1.7,.3,p.warm,p.ink,.045)+line(.27,-.5,.27,0,p.ink,.08)+line(1.53,-.5,1.53,0,p.ink,.08)+line(.25,-.8,.25,-.4,p.ink,.055)+line(1.55,-.8,1.55,-.4,p.ink,.055)+`</g>`}
function lamp(p:Palette,x=0){return `<g data-feature="warm-lamp">`+path(`M${x+.8},-6.56 L${x-1},-.12 Q${x+1.15},.35 ${x+3.3},-.12 L${x+1.5},-6.56 Z`,'url(#LAMP-GLOW)','none',0,'filter="url(#SOFT-GLOW)"')+path(`M${x},0 v-6.2 q0,-.45 .45,-.45 h.75`, 'none',p.ink,.09)+rect(x+.8,-6.73,.7,.16,p.warm,p.ink,.055)+line(x+.9,-6.54,x+1.4,-6.54,'#ead89c',.09)+rect(x-.12,-.35,.24,.35,p.shade,p.ink,.04)+line(x+.04,-6.2,x+.04,-.35,p.shadow,.035,'opacity=".35"')+`</g>`}
function playground(p:Palette){
  let s=path('M0,0 H7 v-.1 H0Z',p.warm,p.fine,.025)+rect(1.1,-2.15,1.5,.12,p.wall,p.ink,.035)
  s+=path('M1.1,-.05 V-2.15 M2.6,-2.15 V-.05 M1.04,-2.2 L1.85,-2.78 L2.66,-2.2Z',p.warm,p.ink,.045)
  s+=path('M2.64,-2.06 Q3.02,-1.52 3.37,-.8 Q3.75,-.05 4.6,-.08 L4.6,-.23 Q3.9,-.2 3.57,-.91 Q3.2,-1.7 2.7,-2.2Z',p.glass,p.ink,.04)
  s+=path('M.48,-.04 V-2.05 H1.06 M.48,-.5 H1.06 M.48,-.95 H1.06 M.48,-1.4 H1.06 M5,0 L5.55,-2.05 H6.55 L7.1,0 M5.6,-2.05 L6.05,0','none',p.ink,.045)
  s+=line(5.8,-1.96,5.8,-.66,p.fine,.022)+line(6.32,-1.96,6.32,-.66,p.fine,.022)+rect(5.73,-.68,.66,.09,p.warm,p.ink,.025)
  return s
}
function park(p:Palette){return rect(0,-.08,17,.08,p.green)+path('M0,0 H17 l.5,.28 H.5Z',p.foliage,p.fine,.025)+path('M4,0 H8 l.5,.25 H4.5Z',p.wall,p.fine,.025)+tree(p,2.5,0,.65,1)+tree(p,14.5,0,.85,2)+bench(p,5.8)+`<ellipse cx="11.6" cy=".03" rx="3.8" ry=".14" fill="${p.shadow}" opacity=".16"/>`+`<g transform="translate(8)">${playground(p)}</g>`+path('M1,.12 h1.2 M9,.14 h1.5 M13,.12 h1.3','none',p.green,.03,'opacity=".5"')+person(p,4.4)+path('M.5,-.1 q.2,-.7 .4,0 M16,-.1 q.2,-.7 .4,0','none',p.green,.035)}
function shelter(p:Palette){
  return `<g data-feature="shelter-frame">`+path('M.1,0 H5.1 l-.25,.18 H.3Z',p.shadow,'none',0,'opacity=".2"')+path('M.25,-.08 V-2.55 H4.65 V-.08Z',p.glass,p.fine,.04)+rect(.25,-2.53,4.4,.32,p.shadow,'none',0,'opacity=".2"')+line(.9,-.4,1.8,-2.1,p.sheen,.05,'opacity=".6"')+line(2.9,-.4,3.4,-1.3,p.sheen,.05,'opacity=".5"')+
    path('M4.65,-.08 V-2.55 l.45,-.25 V-.33Z',p.shade,p.ink,.04)+
    path('M-.1,-2.65 l.5,-.28 h4.95 l-.5,.28Z',p.roof,p.ink,.045)+rect(-.1,-2.65,4.95,.12,p.wall,p.ink,.045)+
    path('M.25,-.05 V-2.53 M2.45,-2.53 V-.05 M4.65,-2.53 V-.05','none',p.ink,.055)+line(.35,-1.05,4.55,-1.05,p.fine,.025)+
    bench(p,.65)+rect(3.15,-2.3,1.08,1.2,p.paper,p.fine,.025)+line(3.32,-2.08,4.02,-2.08,p.fine,.025)+line(3.32,-1.9,3.85,-1.9,p.fine,.025)+line(3.32,-1.72,4.02,-1.72,p.fine,.025)+`</g>`
}
function subway(p:Palette){
  let s=groundShadow(6.5,.4,p)+rect(0,-3.05,6.5,3.05,p.wall,p.ink,LW.edge)+path('M6.5,0 v-3.05 l.4,-.23 V-.23Z',p.shade,p.ink,.04)+roofPlane(p,-.15,-3.15,6.8,.4,.23)
  s+=rect(.35,-2.75,3.65,2.6,p.shade,p.ink,.04)+shade(.35,-2.75,3.65,.35,p,.3)
  // Steps are drawn inside their own aperture, terminating above the pavement datum.
  s+=`<svg x=".47" y="-2.62" width="3.4" height="2.32" viewBox="0 0 3.4 2.32" overflow="hidden" data-feature="contained-stairs">`
  for(let i=0;i<8;i++){const x=.12+(i*.38),y=2.2-(i*.25);s+=path(`M${x},${y} h.38 v-.25`,'none',p.ink,.045)}
  s+=path('M.18,1.7 L3.1,.1','none',p.ink,.045)+`</svg>`
  s+=rect(4.45,-2.72,1.58,2.57,p.glass,p.ink,.045)+line(4.7,-.6,5.1,-2.3,p.sheen,.05,'opacity=".6"')+line(5.24,-2.6,5.24,-.16,p.fine,.035)+rect(4.53,-2.58,1.4,.34,p.shade,p.fine,.02)
  s+=path('M5.09,-2.4 h.3 m-.2,-.08 .1,-.08 .1,.08 M5.19,-2.36 l.1,.08 .1,-.08','none',p.paper,.025)+line(0,-.08,6.5,-.08,p.ink,.075)
  return s+line(5.9,-3.38,5.9,-4.2,p.ink,.055)+circle(5.9,-4.53,.34,p.warm,p.ink,.045)+path('M5.74,-4.6 h.32 M5.9,-4.6 v.25','none',p.ink,.04)
}
function wheel(p:Palette,x:number,y=-.31,r=.31){return `<ellipse cx="${x}" cy=".02" rx="${r*1.3}" ry="${r*.22}" fill="${p.shadow}" opacity=".25"/>`+circle(x,y,r,p.ink,p.ink,.035)+circle(x,y,r*.65,p.shade,p.fine,.035)+circle(x,y,.055,p.fine)+path(`M${x-r*.4},${y} h${r*.8} M${x},${y-r*.4} v${r*.8}`,'none',p.fine,.025)}
function car(p:Palette){return `<g data-feature="refined-car">`+path('M.35,0 H4.25 l-.2,.1 H.55Z',p.shadow,'none',0,'opacity=".2"')+
  path('M.12,-.32 L.15,-.71 Q.19,-.89 .49,-.93 L.92,-1.01 L1.43,-1.43 Q1.57,-1.55 1.88,-1.54 H2.55 Q2.8,-1.53 3.04,-1.28 L3.32,-.98 L4.08,-.85 Q4.4,-.77 4.46,-.58 V-.29 H3.93 Q3.93,-.73 3.55,-.73 Q3.17,-.73 3.16,-.29 H1.27 Q1.27,-.73 .89,-.73 Q.51,-.73 .5,-.29 Z',p.wall,p.ink,.06)+rect(1.27,-.48,1.89,.17,p.shadow,'none',0,'opacity=".16"')+
  path('M1.14,-1.02 L1.56,-1.4 H2.03 V-1.02 Z M2.16,-1.4 H2.55 Q2.72,-1.38 2.91,-1.17 L3.05,-1.02 H2.16 Z',p.glass,p.ink,.035)+path('M1.5,-1.08 L1.75,-1.33 M2.35,-1.08 L2.6,-1.33','none',p.sheen,.04,'opacity=".7"')+
  path('M1.05,-.95 H3.22 M1.43,-.9 V-.38 M2.15,-.94 V-.38 M3.13,-.9 V-.45 M1.4,-.37 H3.13','none',p.fine,.03)+
  path('M.29,-.67 H.56 M4.12,-.66 H4.36','none',p.warm,.09)+line(1.72,-.81,1.9,-.81,p.ink,.035)+line(2.7,-.81,2.87,-.81,p.ink,.035)+
  path('M2.93,-1.01 l.15,-.1 .17,.02 .02,.07 -.27,.07 Z',p.shade,p.ink,.025)+wheel(p,.89)+wheel(p,3.55)+`</g>`}
function furniture(p:Palette){return lamp(p,.3)+bench(p,2)+`<ellipse cx="4.7" cy=".02" rx=".4" ry=".06" fill="${p.shadow}" opacity=".22"/>`+rect(4.4,-.95,.5,.95,p.shade,p.ink,.055)+rect(4.67,-.95,.23,.95,p.shadow,'none',0,'opacity=".2"')+rect(4.35,-1.02,.6,.1,p.warm,p.ink,.04)+path('M5.7,0 v-.85 q0,-.65 .5,-.65 q.5,0 .5,.65 V0 M7.2,0 v-.85 q0,-.65 .5,-.65 q.5,0 .5,.65 V0','none',p.ink,.075)+person(p,9)}
function creek(p:Palette){
  let s=`<g data-feature="refined-bridge">`+path('M0,0 Q2,-.4 4,.1 T8,.1 T12,.1 T16,0 V1.8 H0Z',p.water,p.fine,.035)
  for(let i=0;i<15;i++){const x=.4+(i*1.03),y=.45+((i%3)*.38);s+=path(`M${x},${y} q.3,-.08 .65,0`,'none',p.paper,.055)}
  s+=path('M2.4,.25 Q8.4,-.5 14.4,.25 V.75 Q8.4,0 2.4,.75Z',p.shadow,'none',0,'opacity=".14"')
  s+=path('M0,.05 L1,-.4 2.5,-.35 3,.1 M13,.1 l1,-.4 1.5,.1 .5,.3',p.foliage,p.green,.055)
  // Far rail, shallow deck top, filled fascia and curved underside.
  s+=path('M2.35,-1.5 Q8.35,-3.1 14.35,-1.5','none',p.fine,.065)
  s+=path('M2,-.25 Q8,-1.85 14,-.25 L14.35,-.5 Q8.35,-2.1 2.35,-.5 Z',p.wall,p.ink,.045)
  s+=path('M2,-.25 Q8,-1.85 14,-.25 V.04 Q8,-1.56 2,.04 Z',p.warm,p.ink,.065)
  for(let i=0;i<=20;i++){const t=i/20,x=2+(t*12),y=-.25-(3.2*t*(1-t));s+=line(x,y-.02,x+.35,y-.27,p.fine,.028)}
  for(let i=0;i<=16;i++){const t=i/16,x=2+(t*12),y=-.25-(3.2*t*(1-t));s+=line(x,y-.03,x,y-1.07,p.ink,.045)}
  s+=path('M2,-1.32 Q8,-2.92 14,-1.32 M2,-.85 Q8,-2.45 14,-.85','none',p.ink,.065)
  s+=rect(1.7,-.33,.55,.65,p.shade,p.ink,.045)+rect(13.77,-.33,.55,.65,p.shade,p.ink,.045)
  for(const [x,y,r] of [[.7,.1,.22],[1.4,.15,.28],[2.6,.36,.16],[14.7,.23,.23],[15.4,.1,.2]])s+=circle(x!,y!,r!,p.shade,p.fine,.035)
  return s+'</g>'
}

function office(p:Palette,height=15){
  const w=17, depth=1.7, lobby=4.2
  const floors=Math.max(1,Math.round((height-lobby-1.3)/3.4)), ff=(height-lobby-1.3)/floors, vision=ff-.85
  let s=rect(0,-height,w,height,'none','none',0,'data-envelope="height"')+groundShadow(w,depth,p)
  // Curtain wall wraps the corner: glass on the side face too, in shadow
  s+=sideWall(p,w,0,-height,depth,p.glassShade)
  s+=rect(0,-height,w,height,p.glass,'none',0)
  for(let f=0;f<floors;f++){
    const y=-lobby-((f+1)*ff)
    // opaque spandrel band, then vision glass with a sheen
    s+=rect(0,y+vision,w,.85,p.spandrel,p.ink,LW.detail)+rect(0,y,w,vision,p.glass,'none',0)+wash(0,y,w,vision,p)
    s+=path(`M${.9+(f%2)},${y+vision-.15} l1.6,${-(vision-.35)} h.6 l-1.6,${vision-.35}Z M${7.5+(f%3)},${y+vision-.15} l1.6,${-(vision-.35)} h.3 l-1.6,${vision-.35}Z`,p.sheen,'none',0,'opacity=".35"')
    for(let k=1;k*1.4<w;k++)s+=line(k*1.4,y,k*1.4,y+vision,p.ink,k%3===0 ? LW.edge : LW.fine) // heavier mullion every third bay
  }
  // Crown: a tall parapet and a recessed screen hiding equipment
  const top=-height+1.3
  s+=rect(0,-height,w,height+top,p.spandrel,p.ink,LW.edge)
  s+=rect(3.8,-height+.2,9.4,.9,p.roof,p.ink,LW.detail)
  for(let x=4.1;x<13.1;x+=.45)s+=line(x,-height+.25,x,top-.25,p.fine,LW.fine)
  s+=roofPlane(p,-.15,-height,w+.3,depth,depth*RISE)
  // Double-height lobby: deep reveal, revolving door, cantilevered canopy and its shadow
  s+=rect(.4,-lobby,w-.8,lobby,p.glassShade,p.ink,LW.edge)+shade(.4,-lobby,w-.8,.5,p,.35)
  for(let x=2.4;x<w-.5;x+=2.1)s+=line(x,-lobby+.5,x,0,p.ink,LW.detail)
  s+=rect(7.2,-2.6,2.6,2.6,p.glass,p.ink,LW.edge)+path('M8.5,-2.6 v2.6 M7.2,-1.3 h2.6','none',p.ink,LW.detail)
  s+=shade(5.9,-2.95,5.2,.45,p,.32)+rect(5.7,-3.15,5.6,.2,p.wall,p.ink,LW.edge)+roofPlane(p,5.7,-3.15,5.6,.8,.8*RISE)
  s+=rect(0,-height,w,height,'none',p.ink,LW.outline)
  return s+line(-.3,0,w+depth+.3,0,p.ink,LW.outline)
}
function industrial(p:Palette,height=6){
  const w=23, depth=1.7, saw=1 // sawtooth roof lights sit inside the stated height
  let s=rect(0,-height,w,height,'none','none',0,'data-envelope="height"')+groundShadow(w,depth,p)
  s+=sideWall(p,w,0,-height+saw,depth)
  // Ribbed metal cladding: panel ribs with a lit and a shaded edge
  s+=rect(0,-height+saw,w,height-saw,p.wall,'none',0)+wash(0,-height+saw,w,height-saw,p)
  for(let x=.65;x<w;x+=.65)s+=line(x,-height+saw+.15,x,-.1,p.fine,LW.fine)+line(x+.08,-height+saw+.15,x+.08,-.1,p.shadow,LW.fine,'opacity=".18"')
  // Sawtooth roof: each tooth is a closed prism. Its slope recedes on the shared projection, its vertical
  // north-light face is glazed, and its end triangle sits on the front wall. Drawn left to right so each
  // slope overlaps the glazing of the tooth before it.
  const tw=w/6, dr=depth*RISE, eave=-height+saw
  for(let x=0;x<w-.01;x+=tw){
    const slope=`M${x},${eave} L${x+tw},${-height} l${depth},${-dr} L${x+depth},${eave-dr} Z`
    s+=`<g data-feature="closed-roof">`+path(slope,p.roof,p.ink,LW.edge)+path(slope,'url(#ROOF-HATCH)','none')
    s+=path(`M${x+tw},${-height} l${depth},${-dr} V${eave-dr} L${x+tw},${eave} Z`,p.glassShade,p.ink,LW.detail)+line(x+tw+(depth*.5),-height-(dr*.5)+.12,x+tw+(depth*.5),eave-(dr*.5)-.12,p.sheen,.04,'opacity=".5"')
    s+=path(`M${x},${eave} L${x+tw},${-height} V${eave} Z`,p.wall,p.ink,LW.edge)+rect(x+tw-.25,-height+.08,.25,saw-.12,p.glass,p.ink,LW.fine)+`</g>`
  }
  s+=shade(0,-height+saw,w,.25,p,.25)
  // Two loading docks: recessed doors with a head shadow, dock shelters and bumpers
  for(const x of [1,7]){
    s+=rect(x-.25,-5.05,5.5,5.05,p.shade,p.ink,LW.edge)+rect(x,-4.8,5,4.8,p.wall,p.ink,LW.edge)
    for(let y=-4.4;y<0;y+=.45)s+=line(x+.15,y,x+4.85,y,p.fine,LW.fine)
    s+=shade(x,-4.8,5,.45,p,.3)+rect(x-.13,-4.95,5.26,.18,p.warm,p.ink,LW.detail)
    for(const dx of [.2,4.64])s+=rect(x+dx,-.65,.16,.65,p.warm,p.ink,LW.fine)
  }
  // Office corner: ribbon window, entrance, canopy and its shadow
  s+=pane(14,-3.1,7,1.3,p,false)
  for(let x=14.7;x<21;x+=1.1)s+=line(x,-3.08,x,-1.82,p.fine,LW.fine)
  s+=pane(19,-2.2,1.3,2.2,p,false,false)+shade(18.6,-2.3,2.5,.2,p,.3)+path('M18.6,-2.5 h2.2 l.3,.2 h-2.2Z',p.roof,p.ink,LW.detail)
  for(const x of [17.6,21.6])s+=rect(x,-.85,.18,.85,p.warm,p.ink,LW.fine)
  s+=rect(0,-height+saw,w,height-saw,'none',p.ink,LW.outline)
  return s+line(-.3,0,w+depth+.3,0,p.ink,LW.outline)
}
function civic(p:Palette,height=6.7){
  const w=12, depth=1.7, eave=-height+.95
  let s=groundShadow(w,depth,p)+sideWall(p,w,0,eave,depth)
  // Stone body with rusticated base courses
  s+=rect(0,eave,w,height-.95,p.wall,'none',0)+wash(0,eave,w,height-.95,p)
  for(let y=-.5;y>-2.1;y-=.5)s+=line(0,y,w,y,p.fine,LW.fine)
  s+=rect(0,-.35,w,.35,p.shade,p.ink,LW.detail)
  s+=roofPlane(p,-.2,eave-.15,w+.4,depth,depth*RISE)
  // Cornice with dentils and its shadow
  s+=shade(0,eave+.15,w,.3,p,.28)+rect(-.2,eave-.15,w+.4,.3,p.wall,p.ink,LW.edge)
  for(let x=.1;x<w;x+=.45)s+=rect(x,eave+.15,.2,.14,p.wall,p.ink,LW.fine)
  // Upper floors for taller civic buildings
  for(let y=-8.8;y>-height+1.1;y-=3)for(const x of [.8,3.6,6.4,9.2])s+=path(`M${x},${y+2} v-1.3 a.85,.85 0 0 1 1.7,0 v1.3Z`,p.glass,p.ink,LW.detail)+shade(x,y+.15,.15,1.85,p,.25)+line(x+.85,y-.1,x+.85,y+2,p.fine,LW.fine)+rect(x-.1,y+2,1.9,.12,p.wall,p.ink,LW.fine)
  // Arched ground-floor windows with keystones and deep reveals
  for(const x of [.7,9]){
    s+=path(`M${x},-.55 V-3.25 a1.1,1.1 0 0 1 2.2,0 V-.55Z`,p.glass,p.ink,LW.edge)+shade(x,-3.25,.18,2.7,p,.3)
    s+=line(x+1.1,-4.3,x+1.1,-.55,p.fine,LW.fine)+line(x,-2.4,x+2.2,-2.4,p.fine,LW.fine)+line(x+.5,-.9,x+1.5,-3.6,p.sheen,.05,'opacity=".6"')
    s+=path(`M${x+.95},-4.38 h.3 l.08,.3 h-.46Z`,p.wall,p.ink,LW.fine)+rect(x-.1,-.55,2.4,.14,p.wall,p.ink,LW.fine)
  }
  // Projecting portico: pediment, entablature, round columns shaded on the right, steps
  s+=shade(3.2,-4.35,5.6,.35,p,.3)+path('M3.1,-4.6 L6,-6.7 L8.9,-4.6Z',p.wall,p.ink,LW.edge)+path('M3.6,-4.8 L6,-6.4 L8.4,-4.8Z','none',p.warm,LW.detail)+circle(6,-5.45,.25,p.warm,p.ink,LW.detail)
  s+=rect(3.25,-4.6,5.5,.25,p.warm,p.ink,LW.edge)+rect(4.1,-4.25,3.8,4,p.shadow,'none',0,'opacity=".28"')
  s+=rect(5.15,-3.1,1.7,2.85,p.glass,p.ink,LW.detail)+line(6,-3.1,6,-.25,p.ink,LW.detail)+line(5.35,-.6,6.3,-3,p.sheen,.05,'opacity=".6"')+rect(5.05,-3.65,1.9,.38,p.wall,p.fine,LW.fine)
  for(const x of [3.5,4.5,7.05,8.05]){
    s+=rect(x,-4.35,.45,4.1,p.wall,p.ink,LW.detail)+rect(x+.28,-4.35,.17,4.1,p.shadow,'none',0,'opacity=".2"')
    s+=rect(x-.12,-.4,.69,.15,p.warm,p.ink,LW.fine)+rect(x-.12,-4.35,.69,.18,p.warm,p.ink,LW.fine)
  }
  s+=path('M2.7,0 v-.12 h.2 v-.12 h.2 v-.13 h5.8 v.13 h.2 v.12 h.2 V0Z',p.shade,p.ink,LW.detail)
  s+=rect(0,eave,w,height-.95,'none',p.ink,LW.outline)
  return s+line(-.3,0,w+depth+.3,0,p.ink,LW.outline)
}
function shopfront(p:Palette){
  // Brick pier frame, a sign band with a blank panel, stall risers, and a recessed door
  let s=rect(0,-3.6,8,3.6,p.brick,'none',0)+rect(0,-3.6,8,3.6,'url(#BRICK)','none',0)
  s+=rect(.2,-3.42,7.6,.52,p.warm,p.ink,LW.detail)+rect(1.2,-3.32,4,.32,p.wall,p.fine,LW.fine)
  s+=pane(.35,-2.6,4.65,1.95,p,false)+line(2.65,-2.6,2.65,-.65,p.ink,LW.detail)
  s+=rect(.25,-.65,4.85,.65,p.shade,p.ink,LW.detail)+rect(.45,-.55,2,.45,'none',p.fine,LW.fine)+rect(2.85,-.55,2,.45,'none',p.fine,LW.fine)
  s+=rect(5.3,-2.7,1.55,2.7,p.shadow,'none',0,'opacity=".3"')+pane(5.4,-2.6,1.35,2.6,p,false,false)+line(5.58,-1.3,5.73,-1.3,p.ink,LW.detail)
  s+=pane(6.95,-2.6,.7,2.3,p,false)
  // Striped awning, valance, and the shadow it throws on the glass
  s+=shade(.2,-2.35,4.9,.45,p,.25)
  s+=path('M.15,-2.83 H7.85 l-.3,.43 H-.15Z',p.warm,p.ink,LW.edge)
  for(let x=.15;x<7.7;x+=.7)s+=path(`M${x},-2.83 h.35 l-.3,.43 h-.35Z`,p.wall,p.fine,LW.fine)
  s+=path('M-.15,-2.4 h7.7 v.16 q-.2,.12 -.4,0 q-.2,.12 -.4,0 H-.15Z',p.warm,p.ink,LW.detail)
  for(const x of [.7,3.4])s+=rect(x,-.95,1.05,.3,p.warm,p.fine,LW.fine)+path(`M${x+.25},-.95 v-.38 h.55 v.38 M${x+.4},-1.33 q-.2,-.35 .1,-.3`,'none',p.fine,LW.fine)
  return s+rect(0,-3.6,8,3.6,'none',p.ink,LW.outline)
}
export const podiumTypes=['residential','retail','office','civic'] as const
type PodiumType=typeof podiumTypes[number]
function podiumBase(p:Palette,kind:PodiumType){
  const w=17, depth=1.7
  let s=`<g data-feature="podium-${kind}">`+groundShadow(w,depth,p)+sideWall(p,w,0,-5.5,depth)
  s+=rect(0,-5.5,w,5.5,kind==='retail'?p.brick:p.wall,'none',0)+(kind==='retail'?rect(0,-5.5,w,5.5,'url(#BRICK)','none',0):wash(0,-5.5,w,5.5,p))
  s+=roofPlane(p,-.15,-5.6,w+.3,depth,depth*RISE)+shade(0,-5.4,w,.25,p,.25)
  if(kind==='retail')s+=`<g transform="translate(.3)">${shopfront(p)}</g><g transform="translate(8.6)">${shopfront(p)}</g>`
  if(kind==='residential'){
    for(const x of [.7,3.5,10.7,13.5])s+=pane(x,-3.4,2,2.3,p)+rect(x-.1,-.85,2.2,.85,p.wall,p.ink,LW.detail)+path(`M${x+.15},-.85 q.2,-.7 .4,0 q.2,-.85 .4,0 q.25,-.65 .4,0`,'none',p.green,.075)
    s+=rect(6.6,-3.2,3,3.2,p.shadow,'none',0,'opacity=".3"')+pane(6.75,-3.1,2.7,3.1,p,false)+line(8.1,-3.1,8.1,0,p.ink,LW.detail)
    s+=shade(6.1,-3.35,4.1,.25,p,.3)+path('M6.1,-3.5 l.5,-.35 h3.6 l-.5,.35Z',p.roof,p.ink,LW.detail)
  }
  if(kind==='office'){
    s+=rect(.5,-3.9,16,3.9,p.glassShade,p.ink,LW.edge)+shade(.5,-3.9,16,.4,p,.3)
    for(let k=1;.5+(k*1.2)<16.5;k++)s+=line(.5+(k*1.2),-3.5,.5+(k*1.2),0,p.ink,k%3===0?LW.edge:LW.fine)
    s+=path('M1.4,-.4 l1.4,-3 h.5 l-1.4,3Z M10.4,-.4 l1.4,-3 h.3 l-1.4,3Z',p.sheen,'none',0,'opacity=".3"')
    s+=rect(7,-3.05,2.5,3.05,p.shade,p.ink,LW.detail)+rect(7.18,-2.85,2.14,2.85,p.glass,p.ink,LW.detail)+line(8.25,-2.85,8.25,0,p.ink,LW.detail)+path('M8.08,-1.45 v.38 M8.42,-1.45 v.38','none',p.ink,LW.detail)
    s+=shade(6.3,-3.1,3.9,.3,p,.32)+path('M6.5,-3.35 h3.5 l.4,.25 H6.1Z',p.roof,p.ink,LW.detail)
  }
  if(kind==='civic'){
    s+=pane(1,-3.9,15,3.9,p,false)+rect(1,-3.9,15,3.9,p.shadow,'none',0,'opacity=".12"')
    for(const x of [1.2,4.6,11.9,15.3])s+=rect(x,-4.2,.5,4.2,p.wall,p.ink,LW.detail)+rect(x+.32,-4.2,.18,4.2,p.shadow,'none',0,'opacity=".2"')
    s+=rect(6.8,-3.2,3.4,3.2,p.glass,p.ink,LW.detail)+line(8.5,-3.2,8.5,0,p.ink,LW.detail)
    s+=shade(5.6,-4.05,5.8,.3,p,.3)+rect(5.6,-4.35,5.8,.3,p.warm,p.ink,LW.edge)+rect(6.1,-3.95,4.8,.4,p.wall,p.fine,LW.fine)
    s+=path('M5.4,0 v-.12 h.2 v-.12 h6 v.12 h.2 V0Z',p.shade,p.ink,LW.detail)
  }
  for(let x=.6;x<16.5;x+=2.1)s+=pane(x,-5.1,1.35,.8,p,false)
  return s+rect(0,-5.5,w,5.5,'none',p.ink,LW.outline)+'</g>'
}
export function podiumSvg(kind:PodiumType,skin:Skin){return uniqueSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.2 -7 20.5 7.5" role="img" aria-label="${kind} podium · illustrative template">${definitions(skin)}${podiumBase(palettes[skin],kind)}</svg>`,`podium-${kind}-${skin}`)}
function solar(p:Palette){let s='';for(let i=0;i<4;i++){const x=i*1.55;s+=path(`M${x+.15},0 h1.3 l.35,-.1 h-1.3Z`,p.shadow,'none',0,'opacity=".22"')+path(`M${x},-.25 l.5,-1.35 h1.4 l-.5,1.35 Z`,p.glass,p.ink,LW.edge)+line(x+.45,-.4,x+.85,-1.45,p.sheen,.04,'opacity=".6"')+line(x+.65,-1.25,x+1.55,-1.25,p.fine,.03)+line(x+.5,-.85,x+1.4,-.85,p.fine,.03)+line(x+.8,-1.6,x+.3,-.25,p.fine,.03)+line(x+1.2,-1.6,x+.7,-.25,p.fine,.03)+line(x+.15,-.25,x+.15,0,p.ink,.055)+line(x+1.1,-.25,x+1.1,0,p.ink,.055)}return s}
function bus(p:Palette){
  let s=`<g data-feature="city-bus">`+path('M.12,-.5 V-2.67 Q.12,-3.08 .58,-3.08 H11.35 Q11.86,-3.08 11.88,-2.57 L11.95,-.84 Q11.97,-.5 11.65,-.5Z',p.wall,p.ink,.045)
  s+=rect(.46,-2.69,8.5,1.18,p.glass,p.ink,.035)+path('M1.7,-1.6 l.6,-1 h.25 l-.6,1Z M5.9,-1.6 l.6,-1 h.18 l-.6,1Z',p.sheen,'none',0,'opacity=".45"')+rect(.12,-.9,11.8,.4,p.shadow,'none',0,'opacity=".14"')
  for(let x=1.53;x<9;x+=1.07)s+=line(x,-2.67,x,-1.53,p.ink,.04)
  s+=rect(9.24,-2.69,.85,1.18,p.glass,p.ink,.035)+path('M10.52,-2.69 h.88 q.15,0 .16,.16 l.04,1.7 h-1.08Z',p.glass,p.ink,.035)
  s+=line(11.05,-2.62,11.05,-.9,p.ink,.03)+rect(.4,-1.17,9.2,.16,p.warm)+rect(.47,-2.99,1.65,.16,p.shade)+rect(10.5,-2.98,.86,.16,p.shade)
  s+=path('M.5,-.83 H1.23 M2.65,-.83 H9.4 M10.92,-.69 H11.58','none',p.fine,.03)+path('M11.58,-2.56 h.27 v.39','none',p.ink,.045)+rect(11.62,-.76,.2,.11,p.warm)
  return s+wheel(p,1.95,-.45,.45)+wheel(p,10.15,-.45,.45)+`</g>`
}
function van(p:Palette){return `<g data-feature="delivery-van">`+
  path('M.16,-.38 V-2.33 Q.16,-2.64 .49,-2.64 H3.18 Q3.5,-2.64 3.71,-2.31 L4.35,-1.41 L5.05,-1.3 Q5.41,-1.24 5.42,-.92 V-.38Z',p.wall,p.ink,.045)+
  path('M3.24,-2.4 Q3.42,-2.4 3.54,-2.18 L4.01,-1.49 H3.24Z',p.glass,p.ink,.035)+line(3.4,-1.6,3.6,-2.1,p.sheen,.04,'opacity=".7"')+rect(.16,-.75,5.26,.37,p.shadow,'none',0,'opacity=".14"')+
  path('M.47,-2.31 Q.47,-2.37 .54,-2.37 H2.9 V-.92 H.47Z',p.wall,p.fine,.025)+
  path('M3.1,-2.37 V-.64 H4.15 V-1.29 M.44,-.67 H.61 M1.47,-.67 H3.95 M4.86,-.67 H5.25','none',p.fine,.025)+line(3.32,-1.18,3.57,-1.18,p.ink,.035)+
  path('M4.02,-1.46 l.16,-.11 h.14 v.08 l-.25,.1Z',p.shade,p.ink,.025)+rect(5.1,-1.1,.23,.13,p.warm)+rect(.2,-.99,.14,.25,p.warm)+
  wheel(p,1.05,-.34,.34)+wheel(p,4.4,-.34,.34)+`</g>`}
function cyclist(p:Palette){return `<g data-feature="cyclist">`+`<ellipse cx="1.02" cy=".02" rx="1.05" ry=".07" fill="${p.shadow}" opacity=".22"/>`+
  circle(.4,-.36,.35,'none',p.ink,.035)+circle(1.65,-.36,.35,'none',p.ink,.035)+circle(.4,-.36,.025,p.ink)+circle(1.65,-.36,.025,p.ink)+
  path('M.4,-.36 L.78,-.99 L1.1,-.36Z M.78,-.99 H1.37 L1.1,-.36 M1.37,-.99 L1.65,-.36 M1.37,-.99 l.04,-.17 h.18','none',p.green,.035)+
  circle(1.1,-.36,.055,'none',p.ink,.025)+path('M1.1,-.36 l.13,.09 h.12 M.72,-1.02 h.25','none',p.ink,.04)+
  path('M.84,-1.15 Q.73,-1.02 .83,-.91 L1.02,-.72 L.94,-.42 L1.02,-.4 L1.18,-.76 Q1.19,-.81 1.14,-.86 L.98,-1.04Z',p.shade,p.ink,.025)+
  path('M.78,-1.31 Q.87,-1.48 1.06,-1.48 L1.19,-1.28 L.98,-1.02 Q.83,-1.05 .74,-1.15Z',p.glass,p.ink,.025)+
  path('M1.08,-1.44 Q1.18,-1.44 1.24,-1.31 L1.32,-1.19 L1.23,-1.13 L1.11,-1.29Z',p.glass,p.ink,.022)+
  path('M1.3,-1.22 Q1.4,-1.13 1.43,-1.17 L1.56,-1.22 L1.58,-1.16 L1.42,-1.1 Q1.34,-1.07 1.24,-1.15Z',p.warm,p.ink,.018)+circle(1.57,-1.19,.04,p.warm,p.ink,.015)+
  rect(1.04,-1.58,.08,.13,p.warm)+circle(1.12,-1.67,.108,p.warm,p.ink,.02)+path('M1.01,-1.7 Q1.11,-1.88 1.23,-1.7Z',p.ink,p.ink,.018)+
  path('M.94,-.44 l.13,.02 .04,.05 H.91Z',p.ink,p.ink,.015)+`</g>`}
export const pieces: Piece[] = [
  {id:'01',name:'Apartment block',size:'15 m frontage · adjustable height',width:17,height:40,trigger:'Storeys / building program',note:'A repeated floor template; no invented facade specification.',draw:(p,h)=>building(p,h)},
  {id:'02',name:'Mixed-use podium',size:'17 m base · adjustable height',width:18,height:25,trigger:'Retail + podium + explicit roof flags',note:'Lab fixture includes balconies and a green roof; these are attachments, not inferred design.',draw:(p,h)=>building(p,h??25,true)},
  {id:'03',name:'Townhouse row',size:'4 × 4.4 m illustrative bays · 9 m to the eaves, 10.7 m to the gable',width:18,height:11,trigger:'Confirmed townhouse program',note:'Repeat homes along the street at a fixed height. Rear rows need separate blocks; the strip does not infer site layout.',draw:p=>townhouses(p)},
  {id:'18',name:'Deciduous tree',size:'Approximately 9.7 m high',width:7,height:10,trigger:'Landscape input / mapped tree / scene dressing',note:'A small family of rounded, upright and irregular silhouettes; species and exact location are not asserted.',draw:p=>tree(p)},
  {id:'22',name:'Pocket park',size:'17 m illustrative strip',width:18,height:8.5,trigger:'Park program / mapped park',note:'Play equipment is a synthetic lab attachment; park area alone does not establish it.',draw:park},
  {id:'39',name:'Bus shelter',size:'5.2 m long · 2.9 m high',width:5.5,height:3,trigger:'Mapped shelter / explicit proposal',note:'A bus stop without shelter evidence gets a stop marker, not this pavilion.',draw:shelter},
  {id:'42',name:'Subway entrance',size:'6.9 m long · 4.95 m with marker',width:7,height:5,trigger:'Known entrance / explicitly proposed entrance',note:'Generic stair and elevator symbols; proximity to transit is not an entrance location.',draw:subway},
  {id:'45',name:'Small car',size:'4.5 m long · approximately 1.5 m high',width:4.6,height:1.6,trigger:'Decorative scale reference',note:'Side elevation shows vehicle length, not vehicle width. No traffic count is implied.',draw:car},
  {id:'50',name:'Street furniture',size:'6.7 m lamp · 1.7 m person',width:10,height:6.9,trigger:'Documented public realm / illustrative dressing',note:'Lamp, bench, bin, cycle racks and person share one scale.',draw:furniture},
  {id:'26',name:'Creek + footbridge',size:'16 m illustrative context segment',width:17,height:2.4,trigger:'Mapped water and independently known bridge',note:'Water proximity alone does not establish a bridge, access, or shoreline frontage.',draw:creek},
  {id:'04',name:'Office block',size:'17 m frontage · 15 m body height',width:19,height:15,trigger:'Confirmed office program',note:'Repeated office floors and continuous glazing scale with height; fins are illustrative template details.',draw:office},
  {id:'05',name:'Industrial block',size:'23 m frontage · 6 m body height',width:25,height:6,trigger:'Industrial or warehouse program',note:'Generic loading doors and metal-panel marks; operational layout is illustrative.',draw:industrial},
  {id:'06',name:'Civic block',size:'12 m frontage · 6.7 m illustrative roof peak',width:14,height:6.7,trigger:'Confirmed civic or community program',note:'Public portico and arched windows distinguish this generic template; no named institution or architectural proposal is implied.',draw:civic},
  {id:'12',name:'Shopfront attachment',size:'8 m illustrated frontage · 3.6 m high',width:8.2,height:3.6,trigger:'Retail component',note:'Reusable glazing, entrance and blank sign band. No tenant or shop category is assumed.',draw:shopfront},
  {id:'14',name:'Green roof attachment',size:'10 m illustrative planting strip',width:10.5,height:1,trigger:'Explicit green-roof input',note:'Drops onto a roof anchor; area and roof availability must come from the model.',draw:p=>greenRoof(p,10,0)},
  {id:'15',name:'Solar attachment',size:'Approximately 6.5 m illustrated array',width:6.9,height:1.7,trigger:'Explicit solar PV input',note:'A visual array symbol, not a panel-count, energy-yield or roof-layout calculation.',draw:solar},
  {id:'41',name:'City bus',size:'12 m long · 3.1 m high',width:12.2,height:3.2,trigger:'Mode-confirmed bus context or illustrative vehicle',note:'Generic route display and livery; not a live vehicle, service frequency or capacity claim.',draw:bus},
  {id:'46',name:'Delivery van',size:'5.5 m long · 2.65 m high',width:5.6,height:2.7,trigger:'Illustrative servicing activity',note:'Generic scale reference; does not establish delivery access or loading approval.',draw:van},
  {id:'48',name:'Pedestrian figures',size:'Adults around 1.7 m · three clean silhouettes',width:5,height:1.8,trigger:'Illustrative street life',note:'Walking, standing and wheelchair figures. No demographic or pedestrian-volume inference.',draw:p=>person(p,.5,0,0)+person(p,2,0,1)+wheelchair(p,3.8)},
  {id:'49',name:'Cyclist',size:'Approximately 2.1 m long · 1.8 m high',width:2.2,height:1.85,trigger:'Illustrative street life or cycling context',note:'Filled rider with clean bicycle geometry. No traffic volume or cycle-lane availability is implied.',draw:cyclist},
]
export function definitions(skin:Skin){return `<defs>
  <linearGradient id="WASH" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="${skin==='watercolour'?'#fffdf1':'#7eb4cd'}" stop-opacity=".8"/><stop offset=".45" stop-color="#b6c5c5" stop-opacity=".05"/><stop offset="1" stop-color="#8b9c90" stop-opacity=".45"/></linearGradient>
  <linearGradient id="LEAF-WASH" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="${palettes[skin].paper}" stop-opacity=".28"/><stop offset=".5" stop-color="${palettes[skin].green}" stop-opacity=".02"/><stop offset="1" stop-color="${palettes[skin].green}" stop-opacity=".25"/></linearGradient>
  <linearGradient id="LAMP-GLOW" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f4d477" stop-opacity=".06"/><stop offset=".4" stop-color="#f1d589" stop-opacity=".17"/><stop offset="1" stop-color="#f1d589" stop-opacity="0"/></linearGradient>
  <filter id="SOFT-GLOW" x="-50%" y="-15%" width="200%" height="140%"><feGaussianBlur stdDeviation=".16"/></filter>
  <pattern id="HATCH" width=".55" height=".55" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0,0 V.55" stroke="${palettes[skin].ink}" stroke-width=".035" opacity=".35"/></pattern>
  <pattern id="ROOF-HATCH" width=".34" height=".28" patternUnits="userSpaceOnUse"><path d="M.04,.08 l.1,-.025 M.22,.2 l.06,-.04" stroke="${palettes[skin].ink}" stroke-width=".025" opacity=".45"/></pattern>
  <pattern id="BRICK" width=".9" height=".4" patternUnits="userSpaceOnUse"><path d="M0,.2 H.9 M0,.4 H.9 M.45,0 V.2 M0,.2 V.4" stroke="${palettes[skin].ink}" stroke-width=".02" opacity=".28"/></pattern>
  <pattern id="PANEL" width="2.6" height="3" patternUnits="userSpaceOnUse"><path d="M0,0 H2.6 M0,0 V3" stroke="${palettes[skin].ink}" stroke-width=".025" opacity=".16"/></pattern>
  <filter id="GRAIN" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  </defs>`}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!))
// Unique ids make inline copies safe to paste together; no shared external CSS or fonts.
export function uniqueSvg(svg:string,id:string){
  for(const name of ['WASH','GRAIN','HATCH','ROOF-HATCH','LEAF-WASH','LAMP-GLOW','SOFT-GLOW','BRICK','PANEL'])svg=svg.replaceAll(`id="${name}"`,`id="${id}-${name.toLowerCase()}"`).replaceAll(`#${name}`,`#${id}-${name.toLowerCase()}`)
  return svg
}
export function pieceSvg(piece:Piece,skin:Skin,withPaper=false,height?:number,instance='piece',townhouseBays=4){
  const h=piece.id==='03'?11:(height??piece.height), pad=1.2, below=piece.id==='26'?2.3:.5, width=piece.id==='03'?(townhouseBays*4.4)+.8:piece.width
  const view=`${-pad} ${-h-pad} ${width+(pad*2)} ${h+pad+below}`
  return uniqueSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" role="img" aria-label="${escape(piece.name)} · ${skin} · illustrative component" data-piece="${piece.id}">${definitions(skin)}${withPaper?rect(-pad,-h-pad,width+(pad*2),h+pad+below,palettes[skin].paper):''}<g>${piece.id==='03'?townhouses(palettes[skin],townhouseBays):piece.draw(palettes[skin],height)}</g></svg>`,`${instance}-${piece.id}-${skin}`)
}
export function sceneSvg(skin:Skin,buildingHeight=40){
  const p=palettes[skin], width=164, top=58, ground=0
  const placements:Array<[number,string,number?]>=[[4,'01',50],[24,'02',25],[45,'01',buildingHeight],[66,'03'],[87,'22'],[108,'04'],[134,'06'],[151,'18']]
  let art=rect(0,-top,width,top+13,p.paper)
  art+=background(p)
  art+=line(0,ground,width,ground,p.ink,.09)+rect(0,0,width,1.4,p.wall)+rect(0,1.4,width,5.8,p.road)+rect(0,7.2,width,1.3,p.wall)
  art+=line(0,1.4,width,1.4,p.fine,.06)+line(0,7.2,width,7.2,p.fine,.06)+line(0,4.3,width,4.3,p.paper,.12,'stroke-dasharray="1.6 1.4"')
  for(let i=0;i<9;i++)art+=rect(82+(i*.52),1.6,.3,5.4,p.paper)
  placements.forEach(([x,id,h])=>{const piece=pieces.find(k=>k.id===id)!;art+=`<g data-instance="${id}-${x}" ${['01','02','03','04','05','06'].includes(id)?`class="selectable-building" tabindex="0" role="button" aria-pressed="false" aria-label="Highlight ${piece.name}"`:''} transform="translate(${x})">${piece.draw(p,h)}</g>`})
  for(const [i,x] of [21,43,64,85,105,127,150].entries())art+=tree(p,x,0,.43+((i%3)*.1),i%3)
  for(const x of [2,42,85,129])art+=lamp(p,x)
  art+=`<g transform="translate(77 0)">${shelter(p)}</g><g transform="translate(126 0)">${subway(p)}</g>`
  for(const x of [14,39,67,103,146])art+=`<g transform="translate(${x} 5.8)">${car(p)}</g>`
  art+=`<g transform="translate(113 5.8)">${bus(p)}</g><g transform="translate(53 5.8)">${van(p)}</g><g transform="translate(92 6.5)">${cyclist(p)}</g>`
  for(const [i,x] of [22,48,73,104,123,141].entries())art+=person(p,x,.85,i%2)
  art+=wheelchair(p,132)
  art+=bench(p,82)+`<g transform="translate(147 8.4) scale(.8)">${creek(p)}</g>`
  // Shared geometric datum, not per-building scaling.
  art+=line(2,0,2,-50,p.fine,.055,'stroke-dasharray=".3 .3"')+line(1.6,-50,2.5,-50,p.ink,.055)
  art+=`<text x="3" y="-51.5" font-family="monospace" font-size="1.2" fill="${p.ink}">50 m</text><text x="45" y="${-buildingHeight-1.6}" font-family="monospace" font-size="1.2" fill="${p.ink}">${buildingHeight} m</text>`
  art+=`<text x="4" y="11.5" font-family="sans-serif" font-size="1.05" fill="${p.ink}">Synthetic assembly · shared metre scale · schematic spacing · no policy or site claims</text>`
  return uniqueSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -${top} ${width} ${top+13}" role="group" aria-label="Synthetic component streetscape, ${skin}. Buildings at 50 metres and ${buildingHeight} metres use the same height scale.">${definitions(skin)}${art}</svg>`,`assembly-${skin}`)
}

/** Atmospheric sample context only; replace with sourced context geometry in production. */
function background(p:Palette){
  let art='<g data-feature="illustrative-background">'
  for(let layer=0;layer<2;layer++){
    art+=`<g opacity="${layer===0?.17:.29}">`
    for(let i=0;i<31;i++){
      const x=(i*5.8)-(layer*1.7), w=3.2+((i%4)*.5), h=5+((i*7)%11)+(layer===0?2:0)
      art+=rect(x,-h,w,h,p.shade,p.fine,.035)+rect(x+.4,-h-.45,w-.8,.45,p.shade,p.fine,.025)
      if(i%6===0)art+=path(`M${x+w*.5},${-h-.4} v-2 M${x+w*.5-.35},${-h-1} h.7`,'none',p.fine,.045)
      for(let floor=2;floor<h-1;floor+=1.2)for(let bay=.5;bay<w-.4;bay+=.8)art+=rect(x+bay,-floor,.28,.48,p.fine,'none',0,'opacity=".3"')
    }
    art+='</g>'
  }
  art+='<g opacity=".26">'
  for(let i=0;i<28;i++)art+=tree(p,1+(i*6),-.1,.32+((i%3)*.1),i%3)
  return art+'</g></g>'
}

/** Enlarged studies isolate the visual techniques, rather than adding design selectors. */
export function studySvg(kind:'roof'|'trees'|'light',skin:Skin){
  const p=palettes[skin]
  const bounds=kind==='roof'?'-1 -43 20 9':kind==='trees'?'-1 -12 24 14':'-2 -8 9 9'
  const drawing=kind==='roof'?building(p,40):kind==='trees'?tree(p,3,0,.95,0)+tree(p,11,0,1,1)+tree(p,19,0,.9,2):lamp(p,1)
  return uniqueSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds}" role="img" aria-label="${kind==='roof'?'Closed roof plane and fine texture':kind==='trees'?'Three tree silhouettes with layered foliage':'Subtle downward warm lamp haze'} · ${skin}">${definitions(skin)}${drawing}</svg>`,`study-${kind}-${skin}`)
}
