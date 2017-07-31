import { platform } from 'os'

import Rx from 'rxjs'
import execa from 'execa'

function extractErrorMessage (error) {
  const { stderr } = error
  const errorRegex = /\*\*\* Error \([^:]+: '(.*)'\) \*\*\*/
  let errorMessage = stderr
  const errorDetails = errorRegex.exec(errorMessage)
  if (errorDetails) {
    errorMessage = errorDetails[1]
  }

  return errorMessage
}

function handleError (error, gphotoAction) {
  const { stderr } = error

  function retry () {
    return Rx.Observable.of(1)
      .do(() => {
        console.log('Retry in 2s...')
      })
      .delay(2000)
      .mergeMap(() => gphotoAction)
  }

  // Try to resolve problems based on error message
  if (/MacOS PTPCamera service/i.test(stderr) && platform() === 'darwin') {
    const kill = execa('killall', ['PTPCamera'])
    console.log('Trying to fix issue by killing OSX PTPCamera service...')
    return Rx.Observable.fromPromise(kill)
      .catch((error) => {
        console.log('Unable to kill OSX PTPCamera service...')
        console.error(error.stderr)
        return Rx.Observable.of(1)
      })
      .mergeMap(retry)
  }

  // Retry as last option
  return retry()
}

export function captureImage (path) {
  const capture = execa('gphoto2', ['--capture-image-and-download', '--force-overwrite', '--filename', path], {
    timeout: 30000
  })

  return Rx.Observable.fromPromise(capture)
    .catch((error) => {
      const errorMessage = extractErrorMessage(error)

      console.log('Unable to capture image:')
      console.log(errorMessage)

      return handleError(error, captureImage(path))
    })
}

function setSize (size) {
  const sizeP = execa('gphoto2', ['--set-config', `/main/imgsettings/imagesize=${size}`])
  return Rx.Observable.fromPromise(sizeP)
    .catch((error) => {
      const errorMessage = extractErrorMessage(error)
      console.log('Unable to set size of capture:')
      console.log(errorMessage)

      return handleError(error, setSize(size))
    })
}

function setQuality (quality) {
  const qualityP = execa('gphoto2', ['--set-config', `/main/capturesettings/imagequality=${quality}`])
  return Rx.Observable.fromPromise(qualityP)
    .catch((error) => {
      const errorMessage = extractErrorMessage(error)
      console.log('Unable to set quality of capture:')
      console.log(errorMessage)

      return handleError(error, setQuality(quality))
    })
}

export function setCaptureQuality (size, quality) {
  return Rx.Observable.of(1)
    .mergeMap(() => setQuality(quality))
    .mergeMap(() => setSize(size))
}
