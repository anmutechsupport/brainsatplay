
import {Plot} from '../analyzer/Plot'

import * as brainsatplay from '../../../libraries/js/brainsatplay'

export const settings = {
    name: "BuckleUp",
    devices: ["EEG"],
    author: "Brains@Play",
    description: "Fitbit Data to B@P.",
    categories: ["WIP"],
    instructions:"Coming soon...",
    display: {
      production: false
    },

    // App Logic
    graph:
      {
      nodes: [
        {id: 'plot', class: Plot},
        {id: 'data', class: brainsatplay.plugins.utilities.DataManager},
      ],
      edges: [
        {
          source: 'data:fitbit',
          target: 'plot'
        }
      ]
    },
}
