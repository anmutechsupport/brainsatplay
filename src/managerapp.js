
import {brainsatplay} from './js/brainsatplay'
import {BCIAppManager} from './js/frontend/BCIAppManager'
import {DOMFragment} from './js/frontend/utils/DOMFragment'

import {AppletExample} from './js/applets/AppletExample'
import {uPlotApplet} from './js/applets/uPlotApplet'
import {SpectrogramApplet} from './js/applets/SpectrogramApplet'
import { BrainMapApplet } from './js/applets/BrainMapApplet'
import { SmoothieApplet } from './js/applets/SmoothieApplet'
import { NexusApplet } from './js/applets/nexus/NexusApplet'

let applets = [
	{name:"Smooth",         cls: SmoothieApplet},
	{name:"Nexus",      cls: NexusApplet},
	{name:"Spectrogram",    cls: SpectrogramApplet},
	{name:"Brain Map",      cls: BrainMapApplet},
	{name:"uPlot", 			cls: uPlotApplet   },
	{name:"Example Applet", cls: AppletExample },
];

let bcisession = new brainsatplay('guest','','game');

let mgr = new BCIAppManager(bcisession,applets,undefined,false);

mgr.init();

