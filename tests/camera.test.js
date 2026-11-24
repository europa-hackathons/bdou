// Choosing a camera: prefer an external webcam over the built-in one, never a virtual camera (if avoidable).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameraKind, pickCamera } from '../src/camera.js';

const cam = (deviceId, label) => ({ deviceId, label, kind: 'videoinput' });

test('camera names are classified', () => {
  assert.equal(cameraKind('FaceTime HD Camera'), 'builtin');
  assert.equal(cameraKind('MacBook Pro Camera'), 'builtin');
  assert.equal(cameraKind('Integrated Camera (04f2:b604)'), 'builtin');
  assert.equal(cameraKind('HP TrueVision HD Camera'), 'builtin');
  assert.equal(cameraKind('Logitech BRIO (046d:085e)'), 'webcam');
  assert.equal(cameraKind('HD Pro Webcam C920 (046d:082d)'), 'webcam');
  assert.equal(cameraKind('Razer Kiyo'), 'webcam');
  assert.equal(cameraKind('Jeff’s iPhone Camera'), 'phone');
  assert.equal(cameraKind('OBS Virtual Camera'), 'virtual');
  assert.equal(cameraKind('Some New Camera 4K'), 'external');
  assert.equal(cameraKind(''), 'external');
});

test('auto prefers the external webcam over the laptop camera, whatever the order', () => {
  const list = [cam('a', 'FaceTime HD Camera'), cam('b', 'OBS Virtual Camera'), cam('c', 'Logitech BRIO')];
  assert.equal(pickCamera(list).deviceId, 'c');
  assert.equal(pickCamera([...list].reverse()).deviceId, 'c');
});

test('an unknown plugged-in camera beats the built-in one; built-in beats virtual', () => {
  assert.equal(pickCamera([cam('a', 'Integrated Webcam'), cam('b', 'USB2.0 Camera')]).deviceId, 'b');
  assert.equal(pickCamera([cam('a', 'Integrated Webcam'), cam('b', 'Generic 4K Cam')]).deviceId, 'b');
  assert.equal(pickCamera([cam('v', 'OBS Virtual Camera'), cam('a', 'FaceTime HD Camera')]).deviceId, 'a');
});

test('a camera chosen in Settings wins; if it is unplugged, auto takes over', () => {
  const list = [cam('a', 'FaceTime HD Camera'), cam('c', 'Logitech BRIO')];
  assert.equal(pickCamera(list, 'a').deviceId, 'a');
  assert.equal(pickCamera(list, 'gone').deviceId, 'c');
});

test('no cameras, or labels hidden before permission', () => {
  assert.equal(pickCamera([]), null);
  assert.equal(pickCamera([{ deviceId: 'x', label: '', kind: 'audioinput' }]), null);
  assert.equal(pickCamera([cam('1', ''), cam('2', '')]).deviceId, '1', 'keeps the system order when names are unknown');
});
