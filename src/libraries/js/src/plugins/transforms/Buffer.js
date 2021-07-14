
export class Buffer{

    static id = String(Math.floor(Math.random()*1000000))
    
    constructor(label, session, params={}) {
        this.label = label
        this.session = session
        this.params = params

        this.paramOptions = {
            size: {default: 500, min: 1, max: 2500, step: 1},
        }

        this.ports = {
            default: {
                types: {
                    in: undefined,
                    out: Array,
                }
            }
        }

        this.props = {
            looping: false,
            buffer: []
        }
    }

    init = () => {
        this.props.buffer = []
    }

    deinit = () => {
        this.props.looping = false
    }

    default = (userData) => {
        this.props.buffer.push(userData[0].data)
        if (this.props.buffer.length > this.params.size) this.props.buffer.shift()
        userData[0].data = this.props.buffer
        userData[0].meta.label = this.label
        userData[0].stringify = false

        return userData
    }
}