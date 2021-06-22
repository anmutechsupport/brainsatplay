
import {UI} from './UI.js'
import * as brainsatplay from '../../../libraries/js/brainsatplay'

export const settings = {
    name: "Neosensory Playground",
    devices: ["EEG"],
    author: "Garrett Flynn",
    description: "Work with the Neosensory Buzz.",
    categories: ["WIP"],
    instructions:"Coming soon...",
    display: {
      production: false
    },
    // intro: {
    //   mode: 'single'
    // },
    
    // App Logic
    graph:
      {
      nodes: [
        {id: 'ui', class: UI, params: {}},
        {id: 'buzz', class: brainsatplay.plugins.outputs.Buzz},
        {id: 'spacebar', class: brainsatplay.plugins.inputs.Event, params: {keycode: 'Space'}},
        {id: 'up', class: brainsatplay.plugins.inputs.Event, params: {keycode: 'ArrowUp'}},
      ],
      edges: [

        // Light up LEDs with Up Arrow
        {
          source: 'up', 
          target: 'buzz:leds'
        },
        
        // Buzz with Spacebar
        {
          source: 'spacebar', 
          target: 'buzz:motors'
        },

        // Or Buzz with the Button
        {
          source: 'ui:button', 
          target: 'buzz:motors'
        },

        // Show Device State on the UI
        {
          source: 'buzz:status', 
          target: 'ui'
        },
      ]
    },
}
