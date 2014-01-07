var d = document, c = d.getElementById('view'),
	q = c.getContext('2d'),
	IMMEDIATE = 0, DIRECT = 1, INDIRECT = 2, CORE_SIZE = 800,
	Instruction = function(opCode,AField,AMode,BField,BMode) {
		this.opCode = opCode;
		this.AField = AField;
		this.AMode = AMode;
		this.BField = BField;
		this.BMode = BMode;
		
		this.set = function(inst) {
			this.opCode = inst.opCode;
			this.AField = inst.AField;
			this.AMode = inst.AMode;
			this.BField = inst.BField;
			this.BMode = inst.BMode;
		};
		
		this.print = function() {
			var am='', bm='';
			if (this.AMode == IMMEDIATE) {
				am = '#';
			}
			else if (this.AMode == INDIRECT) {
				am = '@';
			}
			
			if (this.opCode == 'JMP') {
				return this.opCode + ' ' + am + this.AField;
			}
			else {
				if (this.BMode == IMMEDIATE) {
					bm = '#';
				}
				else if (this.BMode == INDIRECT) {
					bm = '@';
				}
				return this.opCode + ' ' + am + this.AField + ' ' + bm + this.BField;
			}
		};
	},
	makeInt = function(s) {
		var result = 0, start, neg;
		if (s[0]=='-') {
			start = 1;
			neg = -1;
		}
		else {
			start = 0;
			neg = 1;
		}
		for (var i=start,l=s.length;i<l;i++) {
			result = 10*result + String.charCodeAt(s[i]) - 48;
		}
		return neg*result;
	},
	makeAddr = function(s) {
		var field, mode;
		if (s[0]=='#') {
			mode = IMMEDIATE;
			field = makeInt(s.substr(1));
		}
		else if (s[0]=='@') {
			mode = INDIRECT;
			field = makeInt(s.substr(1));
		}
		else if (s[0]=='$') {
			mode = DIRECT;
			field = makeInt(s.substr(1));
		}
		else {
			mode = DIRECT;
			field = makeInt(s);
		}
		return {'f':field,'m':mode};
	},
	makeProg = function(s) {
		var cmds = s.split('\n'), parts, op, a, b, prog = [];
		for (var i=0,l=cmds.length;i<l;i++) {
			parts = cmds[i].split(' ');
			op = parts[0];
			a = makeAddr(parts[1]);
			if (parts.length > 2) {
				b = makeAddr(parts[2]);
			}
			else {
				b = {'f':null,'m':null};
			}
			prog.push(new Instruction(op,a.f,a.m,b.f,b.m));
		}
		return prog;
	},
	System = function(size) {
		this.size = size;
		this.core = [];
		for (var i=0;i<size;i++) {
			this.core.push({'inst':new Instruction('DAT',0,IMMEDIATE,0,IMMEDIATE),'owner':-1});
		}
		this.players = [];
		this.addPlayer = function(p,s) {
			var startAddr = Math.floor(CORE_SIZE*Math.random()),
				prog = makeProg(s), who = -1;
			this.players.push({'name':p,'addr':startAddr});
			who = this.players.length - 1;
			for (var i=0,l=prog.length;i<l;i++) {
				this.core[(startAddr+i)%CORE_SIZE].inst.set(prog[i]);
				this.core[(startAddr+i)%CORE_SIZE].owner = who;
			}
		};
		this.draw = function() {
			var w=25,h=32,z=10,colors=[{'c':'#f00','o':'rgba(255,0,0,0.3)'},{'c':'#00f','o':'rgba(0,0,255,0.3)'}],k;
			q.strokeStyle = '#000';
			q.lineWidth = 0.5;
			q.clearRect(0,0,c.width,c.height);
			for (var i=0;i<w;i++) {
				for (var j=0;j<h;j++) {
					k = (i*h)+j;
					if (this.core[k].owner > -1) {
						q.fillStyle = colors[this.core[k].owner].o;
						q.fillRect(z*i,z*j,z,z);
					}
					q.strokeRect(z*i,z*j,z,z);
				}
			}
			for (var j=0,l=this.players.length;j<l;j++) {
				k = this.players[j].addr;
				q.fillStyle = colors[this.core[k].owner].c;
				q.fillRect(z*Math.floor(k/h),z*(k%h),z,z);
			}
			if (this.players.length > 1) {
				d.getElementById('p1addr').innerHTML = '' + this.players[0].addr;
				d.getElementById('p1inst').innerHTML = this.core[this.players[0].addr].inst.print();
				d.getElementById('p2addr').innerHTML = '' + this.players[1].addr;
				d.getElementById('p2inst').innerHTML = this.core[this.players[1].addr].inst.print();
			}
		};
		var that = this;
		this.run = function() {
			var addr, src, dst;
			if (this.players.length == 1) {
				console.log(this.players[0].name+' is the winner!');
			}
			else {
				for (var j=0,l=this.players.length;j<l;j++) {
					addr = this.players[j].addr;
				//	console.log('j: '+j+'; addr: '+addr);
					if (this.core[addr].inst.opCode=='DAT') {
					//	console.log(this.players[j].name+' executes a DAT instruction');
						this.players.splice(j,1);	// kill the player
						j--;l--;
					}
					else if (this.core[addr].inst.opCode=='MOV') {
					//	console.log(this.players[j].name+' executes a MOV instruction');
						src = (addr + this.core[addr].inst.AField) % CORE_SIZE;
						dst = (addr + this.core[addr].inst.BField) % CORE_SIZE;
						if (this.core[addr].inst.BMode == INDIRECT) {
							dst = (dst + this.core[dst].inst.BField) % CORE_SIZE;
						}
						this.core[dst].inst.set(this.core[src].inst);
						this.core[dst].owner = j;
						this.players[j].addr = (addr + 1) % CORE_SIZE;
					}
					else if (this.core[addr].inst.opCode=='ADD') {
					//	console.log(this.players[j].name+' executes an ADD instruction');
						src = this.core[addr].inst.AField;
						dst = (addr + this.core[addr].inst.BField) % CORE_SIZE;
						if (this.core[addr].inst.BMode == INDIRECT) {
							dst = (dst + this.core[dst].inst.BField) % CORE_SIZE;
						}
						this.core[dst].inst.BField += src;
						this.core[dst].owner = j;
						this.players[j].addr = (addr + 1) % CORE_SIZE;
					}
					else if (this.core[addr].inst.opCode=='JMP') {
					//	console.log(this.players[j].name+' executes a JMP instruction');
						this.players[j].addr = (addr + this.core[addr].inst.AField) % CORE_SIZE;
					}
				}
			}
			this.draw();
			window.setTimeout(function(){that.run();}, 500);
		};
	},
	sys = new System(CORE_SIZE);
c.width=512;c.height=512;
d.getElementById('go').onclick = function() {
	sys.addPlayer('P1', d.getElementById('p1').value);
	console.log('P1 added');
	sys.addPlayer('P2', d.getElementById('p2').value);
	console.log('P2 added');
	sys.draw();
//	sys.run();
};
c.onmouseup = function(e) {
	var	x = e.pageX - c.offsetLeft,
		y = e.pageY - c.offsetTop,
		rx= Math.floor(x/10),
		ry= Math.floor(y/10);
	console.log('x: '+rx+'; y: '+ry+'; inst: '+sys.core[(32*rx)+ry].inst.print());
};
sys.draw();
