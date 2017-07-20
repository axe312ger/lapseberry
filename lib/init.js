import { resolve } from 'path'
import { tmpdir } from 'os'

import Rx from 'rxjs'
import execa from 'execa'
import moment from 'moment'

function detectCameras () {
  const detect = execa('gphoto2', ['--auto-detect'])
  return Rx.Observable.fromPromise(detect)
    .catch((error) => {
      console.log('U')
      console.error(error)
      console.log()
      console.log('Waiting 2s to detect the camera again.')
      return Rx.Observable.of(1)
        .delay(2000)
        .mergeMap(detectCameras)
    })
    .mergeMap((result) => {
      const { stdout } = result
      const lines = stdout.split(/[\n\r]+/)
      const portPosition = lines[0].indexOf('Port')
      const cameras = lines.slice(2)
        .map((line) => ({
          model: line.substring(0, portPosition - 1).trim(),
          port: line.substring(portPosition).trim()
        }))

      if (cameras.length === 0) {
        console.log('No cameras detected. Waiting 2s to detect the camera again.')
        return Rx.Observable.of(1)
          .delay(2000)
          .mergeMap(detectCameras)
      }

      return Rx.Observable.of(cameras)
    })
}

function captureTestImage () {
  const start = moment()
  const testImagePath = resolve(tmpdir(), 'lapseberry-test-capture.tmp')
  const capture = execa('gphoto2', ['--capture-image-and-download', '--force-overwrite', '--filename', testImagePath], {
    timeout: 30000
  })
  capture.stdout.pipe(process.stdout)

  return Rx.Observable.fromPromise(capture)
    .catch((error) => {
      const errorRegex = /\*\*\* Error \([^:]+: '(.*)'\) \*\*\*/
      let errorMessage = error.stderr
      const errorDetails = errorRegex.exec(errorMessage)
      if (errorDetails) {
        errorMessage = errorDetails[1]
      }
      console.log('Unable to take test picture.')
      console.log(errorMessage)

      return Rx.Observable.of(1)
        .do(() => {
          console.log('Waiting 5s to try another test capture.')
        })
        .delay(5000)
        .mergeMap(captureTestImage)
    })
    .map(() => {
      const timespan = moment().diff(start, 'seconds')
      console.log(`Successfully captured test image within ${timespan}s`)
      return timespan * 1000
    })
}

export default function createInit$ () {
  const delay = 10 * 1000
  const count = 3

  return detectCameras()
    .do((cameras) => {
      console.log('Detected the following cameras:')
      console.log(cameras.map((camera) => `* ${camera.model} via ${camera.port}`).join('\n'))
    })
    .mergeMap(captureTestImage)
    .mergeMap((minimumDelay) => Rx.Observable.of({
      minimumDelay,
      delay,
      count
    }))
}
