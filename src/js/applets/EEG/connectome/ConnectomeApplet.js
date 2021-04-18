import {brainsatplay} from '../../../brainsatplay'
import {DOMFragment} from '../../../frontend/utils/DOMFragment'
import p5 from 'p5';
import {Connectome} from './Connectome';
import featureImg from './img/feature.png'

//Example Applet for integrating with the UI Manager
export class ConnectomeApplet {

    static name = "Connectome"; 
    static devices = ['eeg']; //{devices:['eeg'], eegChannelTags:['FP1','FP2']  }
    static description = "Visualize connection strength between brain regions."
    static categories = ['data'];
    static image=featureImg

    constructor(
        parent=document.body,
        bci=new brainsatplay(),
        settings=[]
    ) {
    
        //-------Keep these------- 
        this.bci = bci; //Reference to the brainsatplay session to access data and subscribe
        this.parentNode = parent;
        this.settings = settings;
        this.AppletHTML = null;
        //------------------------

        this.props = { //Changes to this can be used to auto-update the HTML and track important UI values 
            id: String(Math.floor(Math.random()*1000000)), //Keep random ID
            buttonOutput: 0 //Add whatever else
        };

        this.connectome = null;
        this.sketch = null;
    }

    //---------------------------------
    //---Required template functions---
    //---------------------------------

     //Initalize the app with the DOMFragment component for HTML rendering/logic to be used by the UI manager. Customize the app however otherwise.
    init() {

        //HTML render function, can also just be a plain template string, add the random ID to named divs so they don't cause conflicts with other UI elements
        let HTMLtemplate = (props=this.props) => { 
            return `
                <div id='${props.id}' style='height:100%; width:100%; display: flex; align-items: center; justify-content: center;'>
                </div>
            `;
        }

        //HTML UI logic setup. e.g. buttons, animations, xhr, etc.
        let setupHTML = (props=this.props) => {
            document.getElementById(props.id);   
        }

        this.AppletHTML = new DOMFragment( // Fast HTML rendering container object
            HTMLtemplate,       //Define the html template string or function with properties
            this.parentNode,    //Define where to append to (use the parentNode)
            this.props,         //Reference to the HTML render properties (optional)
            setupHTML,          //The setup functions for buttons and other onclick/onchange/etc functions which won't work inline in the template string
            undefined,          //Can have an onchange function fire when properties change
            "NEVER"             //Changes to props or the template string will automatically rerender the html template if "NEVER" is changed to "FRAMERATE" or another value, otherwise the UI manager handles resizing and reinits when new apps are added/destroyed
        );  

        if(this.settings.length > 0) { this.configure(this.settings); } //you can give the app initialization settings if you want via an array.


        //Add whatever else you need to initialize        
        const containerElement = document.getElementById(this.props.id);


        const sketch = (p) => {
            p.setup = () => {
                p.createCanvas(containerElement.clientWidth, containerElement.clientHeight);
                this.connectome = new Connectome(p)
                this.connectome.setGraph(this.bci.atlas.data.eegshared.eegChannelTags.map(dict => dict.tag))
            };

            p.draw = () => {
                p.background(0);
                this.connectome.setConnectionStrength(this.bci.atlas.data.coherence)
                this.connectome.draw()
            };
        };
        this.sketch = new p5(sketch, containerElement)
    }

    //Delete all event listeners and loops here and delete the HTML block
    deinit() {
        this.sketch.remove()
        this.AppletHTML.deleteNode();
        //Be sure to unsubscribe from state if using it and remove any extra event listeners
    }

    //Responsive UI update, for resizing and responding to new connections detected by the UI manager
    responsive() {
        let containerElement = document.getElementById(this.props.id)
        this.sketch.resizeCanvas(containerElement.clientWidth, containerElement.clientHeight);
        if (this.connectome != null) this.connectome.setGraph(this.bci.atlas.data.eegshared.eegChannelTags.map(dict => dict.tag))
        //let canvas = document.getElementById(this.props.id+"canvas");
        //canvas.width = this.AppletHTML.node.clientWidth;
        //canvas.height = this.AppletHTML.node.clientHeight;
    }

    configure(settings=[]) { //For configuring from the address bar or saved settings. Expects an array of arguments [a,b,c] to do whatever with
        settings.forEach((cmd,i) => {
            //if(cmd === 'x'){//doSomething;}
        });
    }

    //--------------------------------------------
    //--Add anything else for internal use below--
    //--------------------------------------------

    //doSomething(){}

   
} 