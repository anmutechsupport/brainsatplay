
import * as brainsatplay from '../../../libraries/js/brainsatplay'

export const settings = {
    name: "Motor Imagery",
    devices: ["EEG"],
    author: "Brains@Play",
    description: "Benchmark your first MI Brains@Play plugin.",
    categories: ["WIP"],
    instructions:"Coming soon...",
    display: {
      production: false
    },

    // App Logic
    graph:
      {
      id: 'benchmark',
      nodes: [
        {id: 'data', class: brainsatplay.plugins.utilities.DataManager},
        {id: 'motorimagery', class: brainsatplay.plugins.machinelearning.LDA},
      ],
      edges: [

        // Train Model
        {
          source: 'data:latest',
          target: 'motorimagery:train'
        },

       
      ]
    },
}
