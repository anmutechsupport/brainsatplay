import { StateManager } from '../../ui/StateManager'

export class Buzz{

    static id = String(Math.floor(Math.random()*1000000))
    
    constructor(label, session, params={}) {
        this.label = label
        this.session = session
        this.params = params

        this.props = {
            state: new StateManager(),
            deviceSubscriptions: {},
            toUnsubscribe: {
                stateAdded: [],
                stateRemoved: []
            },
            device: null
        }

        this.ports = {
            default: {},
            motors: {},
            leds: {},
            punch: {},
            status: {}
        }

        let added = (k) => {
            this._subscribeToDevices(k,['buzz'])
            this.session.graph.runSafe(this,'status',[{data:true, meta:{}}])
        }

        let removed = (k) => {
            if (k.includes('device')){
                // Update Internal Device State
                this.props.device = this.session.getDevice('buzz')
                if (this.props.device)  this.props.device = this.props.device.device
            }
            this.status()
        }

        this.props.toUnsubscribe['stateAdded'].push(this.session.state.subscribeSequential('stateAdded', added))
        this.props.toUnsubscribe['stateRemoved'].push(this.session.state.subscribeSequential('stateRemoved', removed))
    }

    init = () => {

        // Check if Buzz Exists
        this.props.device = this.session.getDevice('buzz')
        if (!this.props.device)  console.log('Must connect your Buzz first')
        else this.props.device = this.props.device.device
        this.session.graph.runSafe(this,'status',[{data:true, meta:{}}])
    }

    deinit = () => {

    }

    status() {
        return [{data: (this.session.getDevice('buzz') != null), meta:{}}]
    }

    default = (userData) => {
        return userData
    }

    punch = (userData) => {
        let punchMe = false
        // Check if Any Users Requested to Punch
        userData.forEach(u => {
            if (u.data == true && u.meta.user === this.session.info.auth.username){
                punchMe = true
            }
        })
        // If Yes, Punch Me 
        if (punchMe){
            let motorCommand = [255,255,255,255]
            let motorsOff = [0,0,0,0]
            if (this.props.device) this.props.device.vibrateMotors([motorCommand,motorsOff])
        }
    }

    motors = (userData) => {    
        if (this.props.device){
            // Vibrate Wrist Based on Frequencies (Single User)
            let motorCommand = this.props.device.mapFrequencies(userData[0].data)
            if (this.props.device) this.props.device.vibrateMotors([motorCommand])
        }

        return userData
    }

    leds = (userData) => {

        if (this.props.device){
            // Fills the Lights (Multi User)
            let flattenedData = userData.map(u=> u.data)
            let mean = this.session.atlas.mean(flattenedData)

            let i1 = Math.min(mean/.33,1)
            let i2 = (i1 === 1 ? Math.min((mean-.33)/.33,1) : 0)
            let i3 = (i2 === 1 ? Math.min((mean-.66)/.33,1) : 0)

            let ledColors = [[0,255,0],[0,255,0],[0,255,0]]
            let ledIntensities = [i1,i2,i3]
            this.props.device.setLEDs(ledColors, ledIntensities)
        }

        return userData
    }

    
    _subscribeToDevices(k, nameArray=[]) {
        if (k.includes('device')){
            let deviceInfo = this.session.state.data[k]
            if (nameArray.includes(deviceInfo.deviceName)){
            this.props.device = this.session.getDevice(deviceInfo.deviceName).device.device
        }
        }
     }

}