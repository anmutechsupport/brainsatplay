import {Session} from '../../../libraries/js/src/Session'
import {DOMFragment} from '../../../libraries/js/src/ui/DOMFragment'
import * as settingsFile from './settings'
import {SoundJS} from '../../../platform/js/frontend/UX/Sound'
import { BreathCapture } from '../../../libraries/js/src/utils/BreathCapture'
import ts from 'typescript'


//Example Applet for integrating with the UI Manager
export class BreathTrainerApplet {

    constructor(
        parent=document.body,
        session=new Session(),
        settings=[]
    ) {
    
        //-------Keep these------- 
        this.session = session; //Reference to the Session to access data and subscribe
        this.parentNode = parent;
        this.info = settingsFile.settings;
        this.settings = settings;
        this.AppletHTML = null;
        //------------------------

        this.props = { //Changes to this can be used to auto-update the HTML and track important UI values 
            id: String(Math.floor(Math.random()*1000000)), //Keep random ID
            //Add whatever else
        };

        this.canvas;
        this.ctx;

        this.canvas2;
        this.ctx2;

        this.mode = 'dvb'; //dvb, rlx, jmr, wmhf
        this.animation = 'sine'; //sine, circle;
        
        
        this.fs = 10;
        this.amplitudes = [];
        this.startTime = undefined;

        this.lastFrame = 0;
        this.currentFrame = 0;
        this.time = 0;
        this.fps = 60;
        this.thisFrame = Date.now();

        this.frequencyMaps = [
            {type:"diaphragmatic",map:[{frequency:0.1,amplitude:2,duration:60}]},
            {type:"breathhold",map:[{frequency:0.1,amplitude:2,duration:5},{frequency:0.0,amplitude:2,duration:10},{frequency:0.1,amplitude:2,duration:5}]},
            {type:"wimhof",map:[{frequency:1,amplitude:1,duration:30},{frequency:0.1,amplitude:2,duration:30}]},
            {type:"relaxation",map:[{frequency:0.166667,amplitude:2,duration:60}]},
            {type:"jacobsons",map:[{frequency:0.1,amplitude:2,duration:60}]}
        ];

        this.currentFrequencyMap = {type:"diaphragmatic",map:[{frequency:0.1,amplitude:2,duration:60}]};

        this.currentFrequency = 0.1;
        this.currentMapIndex = 0;
        this.lastAmplitude = 0;
        this.timeScaled = 0;

        this.scaling = 10;
        this.animating = false;
        this.step=-4;

        this.Capture = new BreathCapture();
        

    }

    //---------------------------------
    //---Required template functions---
    //---------------------------------

    //Initalize the applet with the DOMFragment component for HTML rendering/logic to be used by the UI manager. Customize the app however otherwise.
    init() {

        //HTML render function, can also just be a plain template string, add the random ID to named divs so they don't cause conflicts with other UI elements
        let HTMLtemplate = (props=this.props) => { 
            return `
            <div id='${props.id}' style='height:100%; width:100%;'>
                <div id='${props.id}menu'>
                    <button id='${props.id}startmic'>Start Mic</button>
                    <button id='${props.id}stopmic'>Stop Mic</button>
                    <button id='${props.id}calibrate'>Calibrate (Breathe-in then click after ~1 sec)</button>
                    <select id='${props.id}select'>
                        <option value='diaphragmatic' selected>Diaphragmatic</option>
                        <option value='breathhold'>Breath Hold</option>
                        <option value='relaxation'>Relaxation Breathing</option>
                        <option value='jacobsons'>Jacobson's Muscular Relaxation</option>
                        <option value='wimhof'>Wim Hof Method</option>
                    </select>
                </div> 
                <canvas id='${props.id}sinecanvas' style='position:absolute;width:100%;height:100%;'></canvas>
                <canvas id='${props.id}canvas' style='width:100%;height:100%;background-color:rgba(0,0,0,0);'></canvas>
            </div>`;
        }

        /*
                     <select id='${props.id}select'>
                        <option value='dvb' selected>Diaphragmatic</option>
                        <option value='rlx'>Relaxation</option>
                        <option value='jmr'>Jacobson's Muscular Relaxation</option>
                        <option value='wmhf'>Wim Hof Method</option>
                    </select>

        */

        //HTML UI logic setup. e.g. buttons, animations, xhr, etc.
        let setupHTML = (props=this.props) => {
            this.canvas = document.getElementById(props.id+'canvas');
            this.ctx = this.canvas.getContext("2d");

            this.canvas2 = document.getElementById(props.id+'sinecanvas');
            this.ctx2 = this.canvas2.getContext("2d");

            this.yscaling = this.canvas.height*0.2;
            this.xscaling = this.canvas.width*0.1;
            console.log(this.canvas)
            //console.log("gen amplitudes");
            this.genBreathingAmplitudes(this.mode);

            document.getElementById(props.id+'select').onchange = (event) => {
                let t = event.target.value;
                this.time = 0;
                this.timeScaled = 0;
                let found = this.frequencyMaps.find((o)=> {
                    if(o.type === t)
                        return true;
                });
                if(found) this.currentFrequencyMap = found
            }

            document.getElementById(props.id+'startmic').onclick = () => {
                this.Capture.analyze();
                this.Capture.connectMic();
            }

            document.getElementById(props.id+'stopmic').onclick = () => {
                this.Capture.stopMic();
            }
            
            document.getElementById(props.id+'calibrate').onclick = () => {
                this.Capture.calibrate();
            }

            //console.log("drawing...")
            this.animating = true;
            this.animate();
        }

        this.AppletHTML = new DOMFragment( // Fast HTML rendering container object
            HTMLtemplate,       //Define the html template string or function with properties
            this.parentNode,    //Define where to append to (use the parentNode)
            this.props,         //Reference to the HTML render properties (optional)
            setupHTML,          //The setup functions for buttons and other onclick/onchange/etc functions which won't work inline in the template string
            undefined,          //Can have an onchange function fire when properties change
            "NEVER"             //Changes to props or the template string will automatically rerender the html template if "NEVER" is changed to "FRAMERATE" or another value, otherwise the UI manager handles resizing and reinits when new apps are added/destroyed
        );  

        if(this.settings.length > 0) { this.configure(this.settings); } //You can give the app initialization settings if you want via an array.


        //Add whatever else you need to initialize

    
    }

    //Delete all event listeners and loops here and delete the HTML block
    deinit() {
        this.animating = false;
        this.Capture.stop();
        this.AppletHTML.deleteNode();
        //Be sure to unsubscribe from state if using it and remove any extra event listeners
    }

    //Responsive UI update, for resizing and responding to new connections detected by the UI manager
    responsive() {
        //let canvas = document.getElementById(this.props.id+"canvas");
        this.canvas.width = this.AppletHTML.node.clientWidth;
        this.canvas.height = this.AppletHTML.node.clientHeight;
        this.canvas2.width = this.AppletHTML.node.clientWidth;
        this.canvas2.height = this.AppletHTML.node.clientHeight;
        this.yscaling = this.canvas.height*0.2;
        this.xscaling = this.canvas.width*0.1;
    }

    configure(settings=[]) { //For configuring from the address bar or saved settings. Expects an array of arguments [a,b,c] to do whatever with
        settings.forEach((cmd,i) => {
            //if(cmd === 'x'){//doSomething;}
        });
    }

    //--------------------------------------------
    //--Add anything else for internal use below--
    //--------------------------------------------

    //Make an array of size n from a to b 
    makeArr(startValue, stopValue, nSteps) {
        var arr = [];
        var step = (stopValue - startValue) / (nSteps - 1);
        for (var i = 0; i < nSteps; i++) {
            arr.push(startValue + (step * i));
        }
        return arr;
    }

    drawAudio = () => {

        this.lastFrame = this.currentFrame;
        this.currentFrame = performance.now();
        this.fps = (this.currentFrame - this.lastFrame)*0.001;

        let height = this.canvas.height;
        let width = this.canvas.width;

        let audInterval = this.fps;
        //if(this.Capture.audTime[this.Capture.audTime.length-2]>0) audInterval = 0.001*(this.Capture.audTime[this.Capture.audTime.length-1] - this.Capture.audTime[this.Capture.audTime.length-2]);


        //Generate sine wave at time with current frequency
        //when current frequency timer ends, transition to next frequency gradually
        //rotate, rinse, and repeat
        //console.log(this.currentFrequencyMap,this.currentMapIndex);

        if(this.currentFrequency < this.currentFrequencyMap.map[this.currentMapIndex].frequency) {
            this.latentTime += this.fps;
            this.currentFrequency += this.fps*this.currentFrequencyMap.map[this.currentMapIndex].frequency;
            if (this.currentFrequency > this.currentFrequencyMap.map[this.currentMapIndex].frequency) 
                this.currentFrequency = this.currentFrequencyMap.map[this.currentMapIndex].frequency;
        } else if (this.currentFrequency > this.currentFrequencyMap.map[this.currentMapIndex].frequency) {
            this.latentTime += this.fps;
            this.currentFrequency -= this.fps*this.currentFrequencyMap.map[this.currentMapIndex].frequency;
            if (this.currentFrequency < this.currentFrequencyMap.map[this.currentMapIndex].frequency) 
                this.currentFrequency = this.currentFrequencyMap.map[this.currentMapIndex].frequency;
        }

        
        this.timeScaled += audInterval+(width/1024 - this.fps);
        this.time += this.fps;
        //console.log(this.time);
        if(this.currentFrequency === this.currentFrequencyMap.map[this.currentMapIndex].frequency) {
            let timeaccum = 0;
            for(let i = 0; i<this.currentMapIndex; i++) {
                timeaccum += this.currentFrequencyMap.map[i].duration;
            }
            if(this.time > timeaccum+this.latentTime) {
                this.currentMapIndex++;
                if(this.currentMapIndex > this.currentFrequencyMap.map.length) this.currentMapIndex = 0;
            }
        }
        let freq = this.currentFrequencyMap.map[this.currentMapIndex].frequency;
        let amp = this.currentFrequencyMap.map[this.currentMapIndex].amplitude+height/4;

        //let window = width * (audInterval);

        this.ctx2.clearRect(0,0,this.canvas2.width,this.canvas2.height);
        this.ctx2.beginPath();
        this.ctx2.lineWidth = 2;
        this.ctx2.strokeStyle = 'limegreen';

        let stepSize = 1;
        let x = 0;
        let amplitude = 0;
        while(x<width) {
            amplitude = (height/2 + amp * Math.sin((x+this.timeScaled)/(width*freq)));
            this.ctx2.lineTo(x,amplitude);
            x+=stepSize;
        }
        this.ctx2.stroke();



        //FIX
        let foundidx = undefined;
        let found = this.Capture.inPeakTimes.find((t,k)=>{if(t > this.Capture.audTime[0]) {foundidx = k; return true;}});
        if(foundidx) {
            let inpeakindices = []; let intimes = this.Capture.audTime.filter((o,z)=>{if(this.Capture.inPeakTimes.slice(this.Capture.inPeakTimes.length-foundidx).indexOf(o)>-1) {inpeakindices.push(z); return true;}})
            this.inpeaks=inpeakindices;
            let foundidx2 = undefined;
            let found2 = this.Capture.outPeakTimes.find((t,k)=>{if(t > this.Capture.audTime[0]) {foundidx2 = k; return true;}});
            if(foundidx2){ 
                let outpeakindices = []; let outtimes = this.Capture.audTime.filter((o,z)=>{if(this.Capture.outPeakTimes.slice(this.Capture.outPeakTimes.length-foundidx2).indexOf(o)>-1) {outpeakindices.push(z); return true;}})
                this.outpeaks=outpeakindices;
            }
        }
        else { 
            let inpeakindices = []; let intimes = this.Capture.audTime.filter((o,z)=>{if(this.Capture.inPeakTimes.indexOf(o)>-1) {inpeakindices.push(z); return true;}})
            let outpeakindices = []; let outtimes = this.Capture.audTime.filter((o,z)=>{if(this.Capture.outPeakTimes.indexOf(o)>-1) {outpeakindices.push(z); return true;}})
            this.inpeaks = inpeakindices;
            this.outpeaks = outpeakindices;
        }

        let xaxis = this.makeArr(0,this.canvas.width,this.Capture.output.audioFFT.length);
        let xaxis2 = this.makeArr(0,this.canvas.width,this.Capture.audSumGraph.length);
        //let xaxis3 = this.makeArr(0,this.canvas.width,this.audhist.length);


        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        //---------------------------------------------------------- Audio FFT
        this.ctx.linewidth = 2;
        
        this.ctx.moveTo(0,this.canvas.height-this.Capture.output.audioFFT[0]);
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'royalblue';
        this.Capture.output.audioFFT.forEach((amp,i)=>{
            if(i > 0) {
                this.ctx.lineTo(xaxis[i],this.canvas.height-amp*(this.canvas.height/255));       
            }
        });
        this.ctx.stroke();

        //------------------------------------------------------------- Audio FFT Sum

        this.ctx.linewidth = 3;
        
        this.ctx.moveTo(0,this.canvas.height-this.Capture.audSumGraph[0]);
        this.ctx.beginPath();
        this.ctx.strokeStyle = "red"; 
                
        this.Capture.audSumGraph.forEach((amp,i)=>{
            if(i > 0) {
                this.ctx.lineTo(xaxis2[i],this.canvas.height-amp*(this.canvas.height/Math.max(...this.Capture.audSumGraph)));       
            }
        });
        this.ctx.stroke();
        //------------------------------------------------------------- Audio FFT Sum Smoothed
        
        this.ctx.moveTo(0,this.canvas.height-this.Capture.audSumSmoothedFast[0]);
        this.ctx.beginPath();
        this.ctx.strokeStyle = "orange"; 
                
        this.Capture.audSumSmoothedFast.forEach((amp,i)=>{
            if(i > 0) {
                this.ctx.lineTo(xaxis2[i],this.canvas.height-amp*(this.canvas.height/Math.max(...this.Capture.audSumGraph)));       
            }
        });
        this.ctx.stroke();
        //------------------------------------------------------------- Audio FFT Sum More Smoothed

        this.ctx.moveTo(0,this.canvas.height-this.Capture.audSumSmoothedSlow[0]);
        this.ctx.beginPath();
        this.ctx.strokeStyle = "gold"; 
                
        this.Capture.audSumSmoothedSlow.forEach((amp,i)=>{
            if(i > 0) {
                this.ctx.lineTo(xaxis2[i],this.canvas.height-amp*(this.canvas.height/Math.max(...this.Capture.audSumGraph)));       
            }
        });
        this.ctx.stroke();

        //------------------------------------------------------------- Audio FFT Sum More Smoothed
        
        this.ctx.moveTo(0,this.canvas.height-this.Capture.audSumSmoothedLong[0]);
        this.ctx.beginPath();
        this.ctx.strokeStyle = "yellow"; 
                
        this.Capture.audSumSmoothedLong.forEach((amp,i)=>{
            if(i > 0) {
                this.ctx.lineTo(xaxis2[i],this.canvas.height-amp*(this.canvas.height/Math.max(...this.Capture.audSumGraph)));       
            }
        });
        this.ctx.stroke();

        //------------------------------------------------------------- SMA 1 peaks
        
        this.ctx.fillStyle = 'chartreuse';
        this.inpeaks.forEach((pidx)=> {
            this.ctx.beginPath();
            this.ctx.arc(xaxis2[pidx],this.canvas.height-this.Capture.audSumSmoothedSlow[pidx]*(this.canvas.height/Math.max(...this.Capture.audSumGraph)),5,0,Math.PI*2,true);
            this.ctx.closePath();
            this.ctx.fill();
        });
        //------------------------------------------------------------- SMA 1 valleys

        this.ctx.fillStyle = 'green';
        this.outpeaks.forEach((pidx)=> {
            this.ctx.beginPath();
            this.ctx.arc(xaxis2[pidx],this.canvas.height-this.Capture.audSumSmoothedSlow[pidx]*(this.canvas.height/Math.max(...this.Capture.audSumGraph)),5,0,Math.PI*2,true);
            this.ctx.closePath();
            this.ctx.fill();
        });
        //------------------------------------------------------------- SMA 2 peaks
        this.ctx.fillStyle = 'pink';
        this.Capture.peakslong.forEach((pidx)=> {
            this.ctx.beginPath();
            this.ctx.arc(xaxis2[pidx],this.canvas.height-this.Capture.audSumSmoothedLong[pidx]*(this.canvas.height/Math.max(...this.Capture.audSumGraph)),5,0,Math.PI*2,true);
            this.ctx.closePath();
            this.ctx.fill();
        });
        //------------------------------------------------------------- SMA 2 valleys

        this.ctx.fillStyle = 'purple';
        this.Capture.valslong.forEach((pidx)=> {
            this.ctx.beginPath();
            this.ctx.arc(xaxis2[pidx],this.canvas.height-this.Capture.audSumSmoothedLong[pidx]*(this.canvas.height/Math.max(...this.Capture.audSumGraph)),5,0,Math.PI*2,true);
            this.ctx.closePath();
            this.ctx.fill();
        });
        //------------------------------------------------------------- SMA fast peaks
        this.ctx.fillStyle = 'red';
        this.Capture.peaksfast.forEach((pidx)=> {
            this.ctx.beginPath();
            this.ctx.arc(xaxis2[pidx],this.canvas.height-this.Capture.audSumSmoothedFast[pidx]*(this.canvas.height/Math.max(...this.Capture.audSumGraph)),5,0,Math.PI*2,true);
            this.ctx.closePath();
            this.ctx.fill();
        });
        //------------------------------------------------------------- SMA fast valleys

        this.ctx.fillStyle = 'crimson';
        this.Capture.valsfast.forEach((pidx)=> {
            this.ctx.beginPath();
            this.ctx.arc(xaxis2[pidx],this.canvas.height-this.Capture.audSumSmoothedFast[pidx]*(this.canvas.height/Math.max(...this.Capture.audSumGraph)),5,0,Math.PI*2,true);
            this.ctx.closePath();
            this.ctx.fill();
        });
    }
    
    animate = () => {

        this.drawAudio();

        if(this.animating)
            setTimeout(()=>{this.animate();},15);
    }

























    //Generate sinewave, you can add a noise frequency in too. Array length will be Math.ceil(fs*nSec)
	genSineWave(freq=20,peakAmp=1,nSec=1,fs=512,freq2=0,peakAmp2=1,offsetx=0,offsetx2=0){
		var sineWave = [];
		var t = [];
		var incscaled = 1/fs; //x-axis time incscaled based on sample rate
		for (var ti = 0; ti < nSec; ti+=incscaled){
			var amplitude = Math.sin(2*Math.PI*freq*(ti+offsetx))*peakAmp;
			amplitude += Math.sin(2*Math.PI*freq2*(ti+offsetx2))*peakAmp2; //Add interference
			sineWave.push(amplitude);
			t.push(ti);
		}
		return [t,sineWave]; // [[times],[amplitudes]]
	}

    genBreathingAmplitudes=(mode='dvb')=>{
        this.startTime = Date.now();
        let amplitudes = [];
        if(mode === 'dvb') {
            amplitudes = this.genSineWave(1/20,1,60,this.fs);
        } else if (mode === 'rlx') {
            let sine = this.genSineWave(1/28,1,7,this.fs,0,1,7);
            let sine2 = this.genSineWave(1/12,1,3,this.fs,0,1,3);
            let amps = [...sine[1],...sine2[1]];
            let t = new Array(amps.length).fill(0);
            t = t.map((x,i)=>{return i/this.fs;})
            amplitudes = [t, amps];
           
        } else if (mode === 'jmr') {
            amplitudes = this.genSineWave(1/24,1,24*3,this.fs);
        } else if (mode === 'wmhf') {
            let sine = this.genSineWave(0.5,1,30,this.fs,0,1,1);
            let sine2 = this.genSineWave(1/20,1,15,this.fs);
            let hold1 = new Array(this.fs*10).fill(-1);
            let sine3 = this.genSineWave(1/20,1,10,this.fs,0,1,15);
            let hold2 = new Array(this.fs*10).fill(1);
            let amps = [...sine[1],...sine2[1],...hold1,...sine3[1],...hold2];
            let t = new Array(amps.length).fill(0);
            t = t.map((x,i)=>{return i/this.fs;})
            amplitudes = [t,amps];
           
        }
        
        this.amplitudes = amplitudes;
                
        // this.x = [...this.amplitudes[0],...this.amplitudes[0].map((x)=> {return x+this.amplitudes[0][this.amplitudes[0].length-1]})];
        // this.y = [...this.amplitudes[1],...this.amplitudes[1]];

        // this.xi0=0;
        // this.xi1=this.x.length-1;
        // this.x.find((xn,i)=>{
        //     if(xn > this.canvas.width || i === this.xi1-1) {
        //         this.xi1 = i;
        //         return true;
        //     }
        // });

        // this.xDiff = undefined;

        // //console.log(amplitudes);
    }

    showAxes = (ctx=this.ctx,xOffset=0,yOffset=0) => {
        var width = ctx.canvas.width;
        var height = ctx.canvas.height;
        var xMin = 0;
        
        ctx.beginPath();
        ctx.strokeStyle = "rgba(128,128,128,0.3)";
        
        // X-Axis
        ctx.moveTo(xMin, height/2 + xOffset);
        ctx.lineTo(width, height/2 + xOffset);
        
        // Y-Axis
        ctx.moveTo(width/2 + yOffset, 0);
        ctx.lineTo(width/2 + yOffset, height);

        // Starting line
        ctx.moveTo(0, 0);
        ctx.lineTo(0, height);
        
        ctx.stroke();
    }
    drawPoint = (ctx=this.ctx, y) => {            
        var radius = 3;
        ctx.beginPath();

        // Hold x constant at 4 so the point only moves up and down.
        ctx.arc(this.canvas.width*0.5, y, radius, 0, 2 * Math.PI, false);

        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    plotSine = (ctx=this.ctx, xOffset, yOffset, amplitude=40, frequency=20) => {
        var width = ctx.canvas.width;
        var height = ctx.canvas.height;
        var scale = 20;

        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgb(66,44,255)";

        // console.log("Drawing point...");
        // drawPoint(ctx, yOffset+this.step);
        
        var x = 0;
        var y = this.canvas.height*0.5;
        //ctx.moveTo(x, y);
        let set = false;
        while (x < width) {
            y = height/2 + amplitude * Math.sin((x+xOffset)/frequency);
            if(!set) { set = true; ctx.moveTo(x, y); }
            ctx.lineTo(x, y);
            x++;
            // console.log("x="+x+" y="+y);
        }
        ctx.stroke();
        ctx.save();

        //console.log("Drawing point at y=" + y);
        ctx.stroke();
        ctx.restore();

        return y;
    }

    drawLatest = () => {

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
       
        this.ctx.save();            
        
        let y = this.plotSine(this.ctx, this.step, 0, 40, 20);
        this.showAxes(this.ctx,y-this.canvas.height*0.5,0);
        this.drawPoint(this.ctx, y);
        this.ctx.restore();

        this.thisFrame = Date.now();
        this.step += 0.001*(this.thisFrame - this.lastFrame);
        this.lastFrame=this.thisFrame;
        
        if(this.animating)
            window.requestAnimationFrame(this.draw);

    }

    spirograph(canvasid) {            
        var canvas = document.getElementById(canvasid);
        var context = canvas.getContext("2d");
        
        this.showAxes(context);
        context.save();
        // var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        var step = 4;
        for (var i = -4; i < canvas.height; i += step) {
            // context.putImageData(imageData, 0, 0);
            this.plotSine(context, i, 54 + i);
        }
    }

   
} 
