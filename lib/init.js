import { resolve } from 'path'
import { unlink } from 'fs'
import { tmpdir } from 'os'

import Rx from 'rxjs'
import execa from 'execa'
import moment from 'moment'

import { captureImage, setCaptureQuality } from './gphoto2'

function detectCameras () {
  const detect = execa('gphoto2', ['--auto-detect'])
  return Rx.Observable.fromPromise(detect)
    .catch((error) => {
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
  let minimumDelay = 0
  const testImagePath = resolve(tmpdir(), 'lapseberry-test-capture.tmp')
  const unlink$ = Rx.Observable.bindNodeCallback(unlink)

  console.log('Capturing test image...')

  return captureImage(testImagePath)
    .map(() => {
      const timespan = Math.ceil(moment().diff(start) / 1000)
      console.log(`Successfully captured test image within ${timespan}s`)
      minimumDelay = timespan * 1000
    })
    .mergeMap(() => unlink$(testImagePath))
    .map(() => ({ minimumDelay }))
}

export default function createInit$ () {
  const delay = 10 * 1000
  const count = 3

  return detectCameras()
    .do((cameras) => {
      console.log('Detected the following cameras:')
      console.log(cameras.map((camera) => `* ${camera.model} via ${camera.port}`).join('\n'))
    })
    .mergeMap(() => setCaptureQuality(22, 0))
    .mergeMap(captureTestImage)
    .mergeMap(({minimumDelay}) => Rx.Observable.of({
      minimumDelay,
      delay,
      count
    }))
}
