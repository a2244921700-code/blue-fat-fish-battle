/* FPS-only sandstone town: authored procedural materials and reusable street
 * furniture. All small parts enter district batches; no network assets. */
(function(root){
  'use strict';
  var cache={},PI=Math.PI;
  function random(seed){return function(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
  function shared(o){o.userData.artShared=true;return o;}
  function geo(key,fn){return cache[key]||(cache[key]=shared(fn()));}
  function texture(kind){
    if(cache['tex/'+kind])return cache['tex/'+kind];
    var T=root.THREE,c=document.createElement('canvas');c.width=c.height=1024;var x=c.getContext('2d'),r=random(82113),N=1024;
    x.fillStyle={stone:'#b8a48a',plaster:'#e6dac3',wood:'#9e7954',tile:'#327779',cloth:'#cfb785',paving:'#b3aaa0',sand:'#cbbda7'}[kind]||'#ffffff';x.fillRect(0,0,N,N);
    if(kind==='stone'||kind==='paving'){
      var rows=kind==='stone'?10:6,cols=kind==='stone'?4:6,rh=N/rows,cw=N/cols;
      for(var row=0;row<rows;row++)for(var col=-1;col<cols+1;col++){
        var xx=(col+(row%2)*.5)*cw,yy=row*rh;
        var light=kind==='stone'?65+r()*12:63+r()*12;
        x.fillStyle='hsl('+(kind==='stone'?35:36)+','+(kind==='stone'?27:14)+'%,'+light+'%)';x.fillRect(xx+3,yy+3,cw-6,rh-6);
        x.strokeStyle='rgba(255,245,216,.42)';x.lineWidth=3;x.beginPath();x.moveTo(xx+6,yy+rh-6);x.lineTo(xx+6,yy+6);x.lineTo(xx+cw-7,yy+6);x.stroke();
        x.strokeStyle='rgba(76,57,41,.22)';x.lineWidth=3;x.beginPath();x.moveTo(xx+cw-5,yy+6);x.lineTo(xx+cw-5,yy+rh-5);x.lineTo(xx+5,yy+rh-5);x.stroke();
        for(var chip=0;chip<5;chip++){x.fillStyle='rgba(100,73,48,.12)';x.fillRect(xx+r()*cw,yy+4+r()*(rh-8),2+r()*12,2+r()*4);}
      }
    }else if(kind==='plaster'){
      for(var cloud=0;cloud<210;cloud++){
        var cx=r()*N,cy=r()*N,rad=8+r()*80,g=x.createRadialGradient(cx,cy,1,cx,cy,rad);
        g.addColorStop(0,cloud%3?'rgba(135,99,65,.04)':'rgba(255,250,223,.16)');g.addColorStop(1,'rgba(140,110,70,0)');x.fillStyle=g;x.fillRect(cx-rad,cy-rad,rad*2,rad*2);
      }
      for(var crack=0;crack<12;crack++){
        var a=r()*N,b=r()*N;x.strokeStyle='rgba(105,83,59,.23)';x.lineWidth=1.1;x.beginPath();x.moveTo(a,b);
        for(var seg=0;seg<4;seg++){a+=r()*12-6;b+=8+r()*12;x.lineTo(a,b);}x.stroke();
      }
    }else if(kind==='wood'){
      for(var plank=0;plank<8;plank++){
        x.fillStyle='rgba(44,29,16,.24)';x.fillRect(plank*128,0,4,N);x.fillStyle='rgba(252,218,162,.16)';x.fillRect(plank*128+4,0,3,N);
      }
      for(var grain=0;grain<1400;grain++){var gx=r()*N,gy=r()*N;x.strokeStyle=grain%3?'rgba(43,25,13,.10)':'rgba(255,226,170,.18)';x.beginPath();x.moveTo(gx,gy);x.bezierCurveTo(gx+3,gy+32,gx-3,gy+70,gx,gy+130);x.stroke();}
    }else if(kind==='tile'){
      for(var ty=0;ty<8;ty++)for(var tx=0;tx<8;tx++){
        var px=tx*128,py=ty*128;x.strokeStyle='#b4bba4';x.lineWidth=3;x.strokeRect(px+2,py+2,124,124);
        x.strokeStyle='#c6af7b';x.lineWidth=3;x.beginPath();for(var k=0;k<16;k++){var ang=k*PI/8,rad=k%2?20:50,xx2=px+64+Math.cos(ang)*rad,yy2=py+64+Math.sin(ang)*rad;if(k)x.lineTo(xx2,yy2);else x.moveTo(xx2,yy2);}x.closePath();x.stroke();
      }
    }else if(kind==='cloth'){
      x.fillStyle='#4e8581';for(var stripe=0;stripe<8;stripe+=2)x.fillRect(stripe*128,0,128,N);
      x.fillStyle='#cfac6d';[38,58,966,986].forEach(function(y){x.fillRect(0,y,N,7);});
      x.fillStyle='rgba(237,228,201,.12)';for(var thread=0;thread<N;thread+=4){x.fillRect(thread,0,1,N);x.fillRect(0,thread,N,1);}
    }else if(kind==='sand'){
      for(var ripple=0;ripple<180;ripple++){x.strokeStyle='rgba(91,73,52,.025)';x.lineWidth=2;x.beginPath();var sy=ripple*6;for(var sx=0;sx<=N;sx+=20)x.lineTo(sx,sy+Math.sin(sx*.012+ripple*.33)*8);x.stroke();}
      for(var pebble=0;pebble<1700;pebble++){x.fillStyle=pebble%2?'rgba(88,78,61,.13)':'rgba(245,222,178,.3)';x.beginPath();x.ellipse(r()*N,r()*N,1+r()*3,1+r()*2,0,0,PI*2);x.fill();}
    }
    for(var i=0;i<42000;i++){x.fillStyle=i%2?'rgba(255,249,224,.09)':'rgba(59,44,29,.055)';x.fillRect(r()*N,r()*N,1+r()*2,1+r()*2);}
    var t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return cache['tex/'+kind]=shared(t);
  }
  function ring(){return geo('ring',function(){return new root.THREE.TorusGeometry(1,.065,6,20);});}
  function cylinder(){return geo('cylinder',function(){return new root.THREE.CylinderGeometry(1,1,1,16);});}
  function ball(){return geo('ball',function(){return new root.THREE.SphereGeometry(1,10,8);});}
  function potShape(){return geo('pot',function(){var T=root.THREE;return new T.LatheGeometry([[0,0],[.29,0],[.38,.12],[.47,.46],[.42,.72],[.28,.91],[.23,1.03],[.29,1.06],[.29,1.15],[.20,1.15],[.19,1.03],[.23,.92],[.34,.72],[.38,.45],[.30,.16],[0,.16]].map(function(p){return new T.Vector2(p[0],p[1]);}),20);});}
  function pot(b,x,y,z,size,glazed){
    b.add(potShape(),glazed?'teal':'terra',x,y,z,size,size,size);
    b.add(ring(),'cream',x,y+.72*size,z,.43*size,.43*size,.43*size,PI/2);
    [-1,1].forEach(function(s){b.add(ring(),glazed?'teal':'terra',x+s*.35*size,y+.81*size,z,.16*size,.20*size,.16*size,0,PI/2);});
  }
  function lantern(b,x,y,z,scale){
    var s=scale||1;
    b.add(cylinder(),'bronze',x,y-.32*s,z,.22*s,.09*s,.22*s);b.add(cylinder(),'bronze',x,y+.32*s,z,.24*s,.08*s,.24*s);
    b.add(geo('lampcap',function(){return new root.THREE.ConeGeometry(1,1,6);}), 'bronze',x,y+.48*s,z,.28*s,.24*s,.28*s);
    b.add(cylinder(),'lamp',x,y,z,.16*s,.53*s,.16*s);
    for(var k=0;k<6;k++){var a=k*PI/3;b.box('iron',x+Math.cos(a)*.19*s,y,z+Math.sin(a)*.19*s,.034*s,.62*s,.034*s);}
    b.add(ring(),'iron',x,y+.69*s,z,.10*s,.13*s,.10*s);b.box('iron',x,y+.90*s,z,.04*s,.28*s,.04*s);
  }
  // Transform facade-local u / out into world positions; all four sides get the
  // same depth treatment. The body shell itself is handled by exposedFaces().
  function building(b,o,map){
    var T=root.THREE,x=o.x,z=o.z,w=o.w,d=o.d,h=o.h,index=map.buildings.indexOf(o);
    b.box('foot',x,.25,z,w+.14,.5,d+.14);
    b.box('cream',x,h+.16,z,w+.46,.32,d+.46);
    b.box('tile',x,h-.29,z,w+.10,.25,d+.10);
    [-1,1].forEach(function(s){b.box('cream',x,h+.64,z+s*(d/2-.19),w,.64,.38);b.box('cream',x+s*(w/2-.19),h+.64,z,.38,.64,d-.76);});
    [[0,1,w,d/2],[0,-1,w,d/2],[1,0,d,w/2],[-1,0,d,w/2]].forEach(function(face,fi){
      var nx=face[0],nz=face[1],len=face[2],depth=face[3],tx=nz,tz=-nx,turn=Math.atan2(nx,nz);
      function box(mat,u,y,out,a,hh,dd,rz){b.box(mat,x+tx*u+nx*(depth+out),y,z+tz*u+nz*(depth+out),a,hh,dd,turn,rz||0);}
      function at(u,y,out){return new T.Vector3(x+tx*u+nx*(depth+out),y,z+tz*u+nz*(depth+out));}
      function visible(u,y){var p=at(u,y,.12);return !map.solids.some(function(s){return s!==o&&s.kind!=='arch'&&p.x>s.min.x+.01&&p.x<s.max.x-.01&&p.y>s.min.y&&p.y<s.max.y&&p.z>s.min.z+.01&&p.z<s.max.z-.01;});}
      // Eave corbels and a shadow reveal make the silhouette and wall depth read.
      for(var cor=-len/2+.6;cor<len/2-.4;cor+=1.15)if(visible(cor,h-.6))box('wood',cor,h-.57,.22,.16,.22,.67);
      var columns=Math.max(1,Math.floor((len-2)/3.2)),spacing=(len-2)/columns;
      for(var row=0;row<Math.floor(h/3);row++)for(var col=0;col<columns;col++){
        var u=-len/2+1+spacing*(col+.5),y=2.1+row*2.75;
        if(!visible(u,y)||(row===0&&Math.abs(u)<1.8))continue;
        box('dark',u,y,.035,1.24,1.61,.07);
        [-1,1].forEach(function(s){box('cream',u+s*.68,y,.12,.16,1.88,.25);});
        if(row===0&&col%2===0){
          var cap=geo('window-arch',function(){var sh=new T.Shape();sh.absarc(0,0,.80,0,PI,false);sh.absarc(0,0,.62,PI,0,true);sh.closePath();return new T.ExtrudeGeometry(sh,{depth:.25,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:1,curveSegments:12});});
          var recess=geo('window-arch-dark',function(){var sh=new T.Shape();sh.absarc(0,0,.62,0,PI,false);sh.closePath();return new T.ShapeGeometry(sh,16);});
          var ap=at(u,y+.80,.02);b.add(cap,'cream',ap.x,ap.y,ap.z,1,1,1,0,turn);
          var rp=at(u,y+.80,.08);b.add(recess,'dark',rp.x,rp.y,rp.z,1,1,1,0,turn);
          for(var spoke=1;spoke<6;spoke++){var a=spoke*PI/6;b.beam('iron',at(u,y+.80,.13),at(u+Math.cos(a)*.58,y+.80+Math.sin(a)*.58,.13),.024);}
        }else box('cream',u,y+.88,.13,1.52,.18,.28);
        box('cream',u,y-.9,.22,1.64,.16,.46);
        box('foot',u,y-.76,.08,1.24,.10,.14);
        if((col+row+index)%3===0){
          // Half-open slatted shutters, with a dark recess behind them.
          [-1,1].forEach(function(s){var p=at(u+s*.42,y,.22);b.box('teal',p.x,y,p.z,.48,1.5,.09,turn+s*.28);});
          for(var l=-.60;l<.7;l+=.18)box('wood',u,y+l,.30,1.03,.055,.045);
        }else{
          box(index%3===2?'wood':'teal',u,y,.11,1.16,1.53,.12);
          for(var sl=-.48;sl<=.5;sl+=.16)box('dark',u+sl,y,.184,.024,1.42,.025);
          box('wood',u,y-.42,.21,1.13,.08,.07);box('wood',u,y+.42,.21,1.13,.08,.07);
        }
        // Periodic projecting timber balconies with an open lattice (no opaque
        // box pretending to be a balcony); all remain above the walkable lane.
        if(row===1&&col%3===1&&len>12){
          box('wood',u,y-.93,.48,2,.18,1.08);
          for(var rail=-.84;rail<=.85;rail+=.21)box('wood',u+rail,y-.43,.99,.065,.82,.065);
          box('wood',u,y-.03,.99,1.9,.09,.09);box('wood',u,y-.82,.99,1.9,.09,.09);
          [-1,1].forEach(function(s){box('wood',u+s*.91,y-.43,.56,.09,.85,.94);box('cream',u+s*.65,y-1.2,.19,.16,.42,.48);});
        }
      }
      if(visible(0,1.6)){
        box('dark',0,1.4,.055,2.02,2.8,.11);box('wood',0,1.36,.13,1.82,2.7,.15);
        for(var slat=-.8;slat<.9;slat+=.2)box('foot',slat,1.36,.215,.025,2.60,.025);
        [-.84,.84].forEach(function(s){box('cream',s*1.28,1.42,.18,.22,2.84,.37);});
        box('cream',0,2.92,.18,2.38,.18,.38);box('cream',0,.06,.26,2.4,.12,.56);
        [.65,2.1].forEach(function(y){box('iron',0,y,.235,1.78,.11,.055);for(var rivet=-.7;rivet<.8;rivet+=.35){var p=at(rivet,y,.275);b.add(ball(),'bronze',p.x,p.y,p.z,.03,.03,.03);}});
        var handle=at(.52,1.32,.28);b.add(ring(),'bronze',handle.x,handle.y,handle.z,.10,.13,.10,0,turn);
        if(len>10){var lp=at(1.70,2.8,.45);lantern(b,lp.x,lp.y,lp.z,.72);box('wood',1.70,3.58,.26,.12,.12,.68);}
      }
      // Alternating stone corner quoins and exposed masonry at the damp base.
      [-1,1].forEach(function(s){for(var yy=.85;yy<h-.8;yy+=.62){var u=s*(len/2-.31);if(visible(u,yy))box('cream',u,yy,.06,yy%1.24<.62?.62:.46,.29,.16);}});
      for(var patch=0;patch<3;patch++){
        var pu=(patch-1)*len*.29;if(!visible(pu,.65))continue;
        for(var br=0;br<2+(patch%2);br++)for(var bc=0;bc<3-br;bc++)box('stone',pu+bc*.38+br*.13,.18+br*.25,.085,.35,.22,.08);
      }
    });
    if(o.variant===1){
      var radius=Math.min(w,d)*.27;
      b.add(cylinder(),'cream',x,h+1,z,radius+.20,.70,radius+.20);
      b.add(geo('dome',function(){return new T.SphereGeometry(1,40,20,0,PI*2,0,PI/2);}), 'teal',x,h+1.35,z,radius,radius*.82,radius);
      b.add(ring(),'bronze',x,h+1.34,z,radius,radius,radius,PI/2);
      b.add(cylinder(),'bronze',x,h+1.55+radius*.82,z,.045,.5,.045);b.add(ball(),'bronze',x,h+1.82+radius*.82,z,.13,.17,.13);
    }else{
      b.box('facade',x+w*.2,h+1.15,z,3,1.8,3.4);b.box('cream',x+w*.2,h+2.1,z,3.3,.2,3.7);
      for(var beam=-1;beam<=1;beam++)b.box('wood',x+w*.2+beam*.85,h+1.85,z+1.9,.12,.16,.9);
      for(var vent=0;vent<5;vent++)b.box('dark',x+w*.2-.60+vent*.3,h+1.3,z+1.72,.11,.65,.06);
    }
    // Rooftop chimney, pottery and beam ends create a populated town skyline.
    b.box('stone',x-w*.3,h+1.02,z-d*.25,.7,1.4,.7);b.box('cream',x-w*.3,h+1.78,z-d*.25,.91,.14,.91);
    pot(b,x-w*.2,h+.32,z+d*.25,.75,true);
  }
  function barrel(b,x,y,z,s){
    var shape=geo('barrel',function(){var T=root.THREE;return new T.LatheGeometry([[0,0],[.40,0],[.45,.1],[.51,.6],[.45,1.1],[.40,1.2],[0,1.2]].map(function(p){return new T.Vector2(p[0],p[1]);}),16);});
    b.add(shape,'wood',x,y,z,s,s,s);
    [.13,.33,.88,1.08].forEach(function(h){var rad=h<.2||h>1?.45:.49;b.add(ring(),'iron',x,y+h*s,z,rad*s,rad*s,rad*s,PI/2);});
    b.box('wood',x,y+1.21*s,z,.68*s,.035*s,.14*s);
  }
  function cart(b,p){
    var x=p.x,z=p.z;
    b.box('wood',x,.64,z,1.65,.18,3.3);
    [-1,1].forEach(function(s){
      for(var board=0;board<4;board++)b.box('wood',x+s*.80,.86+board*.18,z,.09,.14,3.3);
      [-1,1].forEach(function(end){b.box('wood',x+s*.75,1.14,z+end*1.55,.13,1.05,.13);});
      var wheel=geo('wheel',function(){return new root.THREE.TorusGeometry(.50,.07,8,24);});b.add(wheel,'wood',x+s*.94,.53,z,1,1,1,0,PI/2);
      b.add(ring(),'iron',x+s*.95,.53,z,.54,.54,.54,0,PI/2);
      for(var spoke=0;spoke<8;spoke++){var a=spoke*PI/4;var v1=new root.THREE.Vector3(x+s*.94,.53,z),v2=new root.THREE.Vector3(x+s*.94,.53+Math.cos(a)*.47,z+Math.sin(a)*.47);b.beam('wood',v1,v2,.045);}
      b.box('wood',x+s*.55,.72,z+2,.09,.12,1.5);
    });
    barrel(b,x-.35,.73,z-.65,.70);pot(b,x+.32,.73,z+.55,.68,false);
    b.box('cloth',x+.1,1.05,z-.05,1.2,.20,.6);
  }
  function awning(b,x,y,z,w,d,turn){
    var T=root.THREE,g=new T.PlaneGeometry(w,d,16,12),pos=g.attributes.position;
    // Real sag, seam folds, and a scalloped valance cast readable soft shadows.
    for(var i=0;i<pos.count;i++){var u=pos.getX(i),v=pos.getY(i),droop=-.38*(1-Math.pow(u/(w*.5),2))-.13*Math.cos(v/d*PI*2);pos.setXYZ(i,u,droop,v);}
    g.computeVertexNormals();g.userData.temporary=true;b.add(g,'cloth',x,y,z,1,1,1,0,turn||0);
    var c=Math.cos(turn||0),s=Math.sin(turn||0);
    function pt(a,yy,v){return new T.Vector3(x+a*c+v*s,yy,z-a*s+v*c);}
    [-1,1].forEach(function(edge){b.beam('wood',pt(-w/2,y,edge*d/2),pt(w/2,y,edge*d/2),.06);});
    for(var k=0;k<Math.ceil(w/.35);k++){
      var u=-w/2+.17+k*.35;if(u>w/2-.05)break;var p=pt(u,y-.18-.38*(1-Math.pow(u/(w*.5),2)),d/2);
      b.box(k%2?'cloth':'cream',p.x,p.y,p.z,.32,.32,.035,turn||0);
    }
  }
  function street(b,map){
    var T=root.THREE;
    map.props.forEach(function(p){if(p.type==='cart')cart(b,p);else{barrel(b,p.x-.35,0,p.z,.8);barrel(b,p.x+.4,0,p.z+.38,.75);pot(b,p.x+.15,.91,p.z+.05,.38,true);}});
    [-1,1].forEach(function(f){
      awning(b,-50,5.1,46*f,8,4.6,0);
      // Covered B route: ribbed timber ceiling, real hanging lantern frames.
      for(var k=0;k<5;k++){
        var zz=(21+k*4.5)*f;
        b.box('wood',50,3.23,zz,13.7,.25,.25);
        for(var slat=0;slat<6;slat++)b.box('wood',44.2+slat*2.3,3.36,zz, .15,.08,4.4);
        [44.05,55.95].forEach(function(x){lantern(b,x,2.64,zz,.57);});
      }
      [-1,1].forEach(function(side){
        var x=side<0?-39:38,zz=7*f;
        b.box('wood',x,.6,zz,1.1,1.2,4.2);b.box('wood',x,1.23,zz,1.35,.1,4.4);
        for(var leg=-1;leg<=1;leg+=2)b.box('wood',x,1.95,zz+leg*2.15,.11,1.5,.11);
        awning(b,x,2.75,zz,2.3,4.8,0);
        for(var q=-1;q<=1;q++)pot(b,x,1.28,zz+q*1.2,.58,q===1);
        b.box('tile',x+(side<0?-.57:.57),.92,zz,.055,.28,3.9);
      });
      // A court and B court use different colors/props but mirrored cover.
      map.crates.filter(function(c){return c.z*f>0&&c.h>2;}).forEach(function(c,i){
        var top=c.y+c.h/2+.03;
        b.box('cloth',c.x,top+.07,c.z,c.w*.72,.13,c.d*.8);
        pot(b,c.x-c.w*.25,top+.14,c.z-c.d*.22,.5,i%2===0);
        b.box('iron',c.x+c.w*.18,top+.24,c.z+.25,.72,.34,.5);
      });
    });
    // A layered city outside the playable walls, with towers and teal landmarks.
    for(var k=0;k<16;k++){
      var angle=k*PI/8,dist=100+(k%3)*7,xx=Math.cos(angle)*dist,zz=Math.sin(angle)*dist,hh=9+k%4*3;
      b.box(k%3?'facade':'ochre',xx,hh/2,zz,12,hh,13);b.box('cream',xx,hh+.18,zz,12.5,.36,13.5);
      for(var row=0;row<2;row++)for(var win=-1;win<=1;win++)b.box('teal',xx+win*3,3+row*3,zz+6.55,.85,1.6,.12);
      if(k%4===0){
        b.add(cylinder(),'cream',xx,hh+1,zz,3.2,1.6,3.2);b.add(geo('dome',function(){return new T.SphereGeometry(1,32,16,0,PI*2,0,PI/2);}), 'teal',xx,hh+1.8,zz,3.1,2.6,3.1);
        b.box('stone',xx+6,hh*.8,zz,2.1,hh*1.6,2.1);b.box('cream',xx+6,hh*1.6+.3,zz,2.8,.6,2.8);
      }
    }
    // Articulated perimeter: buttresses, capstones, spaced merlons. Inside faces
    // are offset by their actual thickness, not coplanar overlays.
    [-1,1].forEach(function(f){
      b.box('cream',0,7.36,76*f,153.45,.32,1.45);b.box('cream',76*f,7.36,0,1.45,.32,150.55);
      for(var p=-72;p<=72;p+=8){
      b.box('stone',p,3.2,75.28*f,.65,6.4,.40);b.box('stone',75.28*f,3.2,p,.40,6.4,.65);
      [-2,0,2].forEach(function(u){b.box('cream',p+u,7.8,76*f,1,.55,1.2);b.box('cream',76*f,7.8,p+u,1.2,.55,1);});
    }});
  }
  function gate(b,leaf,top,point){
    var T=root.THREE,shape=new T.Shape();shape.moveTo(0,.055);shape.lineTo(leaf.side*leaf.width,.055);
    for(var i=24;i>=0;i--){var u=leaf.width*i/24;shape.lineTo(leaf.side*u,top(leaf,u));}shape.closePath();
    var g=new T.ExtrudeGeometry(shape,{depth:leaf.thickness,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:1,curveSegments:12});g.translate(0,0,-leaf.thickness/2);g.userData.temporary=true;
    var uv=g.attributes.uv;for(var n=0;n<uv.count;n++)uv.setXY(n,uv.getX(n)/2,uv.getY(n)/2);
    b.add(g,'wood',leaf.x,0,leaf.z,1,1,1,0,leaf.angle);
    function localBox(mat,u,y,d,w,h,depth){var p=point(leaf,u,y,d);b.box(mat,p.x,p.y,p.z,w,h,depth,leaf.angle);}
    function vector(u,y,d){var p=point(leaf,u,y,d);return new T.Vector3(p.x,p.y,p.z);}
    [-1,1].forEach(function(face){
      var front=face*(leaf.thickness/2+.025);
      for(var plank=.28;plank<leaf.width;plank+=.29){var hh=top(leaf,plank)-.13;localBox('dark',plank,hh/2+.06,front,.018,hh,.025);}
      [.80,2.18,3.50].forEach(function(y){
        var start=.08;while(start<leaf.width&&top(leaf,start)<y+.10)start+=.04;
        var length=leaf.width-start-.06;if(length<=0)return;
        localBox('iron',start+length/2,y,front+face*.035,length,.15,.065);
        for(var stud=start+.14;stud<leaf.width-.12;stud+=.38){var p=point(leaf,stud,y,front+face*.085);b.add(ball(),'bronze',p.x,p.y,p.z,.042,.042,.035,0,leaf.angle);}
      });
      // Thick stile and the curved top rail use the same leaf profile.
      localBox('wood',.09,top(leaf,.09)/2,front+face*.05,.16,top(leaf,.09)-.06,.12);
      localBox('wood',leaf.width-.09,top(leaf,leaf.width-.09)/2,front+face*.05,.16,top(leaf,leaf.width-.09)-.06,.12);
      for(var rail=0;rail<18;rail++){var a=leaf.width*rail/18,bb=leaf.width*(rail+1)/18;b.beam('wood',vector(a,top(leaf,a)-.08,front+face*.04),vector(bb,top(leaf,bb)-.08,front+face*.04),.085);}
      var hp=point(leaf,leaf.width-.57,1.55,front+face*.15);b.add(ring(),'iron',hp.x,hp.y,hp.z,.18,.22,.18,0,leaf.angle);
    });
    [.80,2.18,2.95].forEach(function(y){b.add(cylinder(),'iron',leaf.x,y,leaf.z,.095,.40,.095);});
  }
  root.FishFpsDetail={texture:texture,building:building,street:street,lantern:lantern,pot:pot,gate:gate};
})(typeof window!=='undefined'?window:globalThis);
