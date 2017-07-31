const Bancroft = require('bancroft')
const sexagesimal = require('@mapbox/sexagesimal')

const bancroft = new Bancroft()
bancroft.on('location', function (location) {
  const {
    longitude: lon, latitude: lat,
    epx, epy,
    timestamp, ept
  } = location
  const pos = sexagesimal.formatPair({ lat, lon })
  const posAccuracy = Math.round((epx + epy) / 2)
  const date = new Date(timestamp)
  const timeAccuracy = ept > 1 ? `± ${Math.round(ept)}s` : ''
  console.log(`${pos} ± ${posAccuracy}m @ ${date.toLocaleString()} ${timeAccuracy}`.trim())
})
bancroft.on('satellite', function (satellite) {
  console.log('got new satellite state')
})
bancroft.on('connect', function () {
  console.log('connected')
})
bancroft.on('disconnect', function () {
  console.log('disconnected')
})
