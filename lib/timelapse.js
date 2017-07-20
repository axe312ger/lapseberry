import { resolve } from 'path'

import Rx from 'rxjs'
import execa from 'execa'
import moment from 'moment'

function shootPhoto (shot) {
  console.log(`Shooting image #${shot.nr}`)
  const gshot2 = execa('gphoto2', ['--capture-image-and-download', '--force-overwrite', '--filename', shot.rawFile])
  return Rx.Observable.fromPromise(gshot2)
    .mergeMap(() => Rx.Observable.of(shot))
}

function convertPhoto (shot) {
  console.log(`Converting #${shot.nr}`)
  const convert = execa('convert', ['-resize', '4096', shot.rawFile, shot.jpgFile])
  return Rx.Observable.fromPromise(convert)
    .mergeMap(() => Rx.Observable.of(shot))
}

export default function createTimelapse$ (config) {
  const { delay, count } = config
  const destination = resolve(process.cwd(), 'timelapses', moment().format('YYYY-MM-DD_h-mm-ss'))
  return Rx.Observable
    .timer(0, delay)
    .take(count)
    .map((x) => {
      // Create shoot object represention one image of the timelapse
      const nr = x + 1
      const rawFile = resolve(destination, `${nr}.arw`)
      const jpgFile = resolve(destination, `${nr}.jpg`)
      return {
        nr,
        jpgFile,
        rawFile
      }
    })
    .do(console.log)
    .mergeMap(shootPhoto)
    .mergeMap(convertPhoto)
}
