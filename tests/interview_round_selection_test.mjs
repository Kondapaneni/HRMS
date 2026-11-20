import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ordinal, nextNumberedInterviewRound, selectedInterviewRound
} from '../frontend/src/utils/interviewRounds.js';

test('ordinal formatting handles exceptional suffixes and multi-digit rounds', () => {
  for (const [n, expected] of [
    [1,'1st'],[2,'2nd'],[3,'3rd'],[4,'4th'],[9,'9th'],[10,'10th'],
    [11,'11th'],[12,'12th'],[13,'13th'],[20,'20th'],
    [21,'21st'],[22,'22nd'],[23,'23rd'],[24,'24th'],
    [100,'100th'],[101,'101st'],[111,'111th']
  ]) assert.equal(ordinal(n),expected);
  for(const n of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1]) {
    assert.throws(() => ordinal(n), RangeError);
  }
});

test('no hardcoded 3rd-to-final transition; Nth rounds continue numerically', () => {
  const expected = [
    ['Shortlisted','1st Round Interview'],
    ['1st Round Interview','2nd Round Interview'],
    ['2nd Round Interview','3rd Round Interview'],
    ['3rd Round Interview','4th Round Interview'],
    ['4th Round Interview','5th Round Interview'],
    ['9th Round Interview','10th Round Interview'],
    ['10th Round Interview','11th Round Interview'],
    ['11th Round Interview','12th Round Interview'],
    ['20th Round Interview','21st Round Interview'],
    ['99th Round Interview','100th Round Interview'],
  ];
  for (const [status, next] of expected) {
    assert.equal(nextNumberedInterviewRound({status}), next);
  }
});

test('the history prevents restarting or regressing numeric rounds after a final status', () => {
  const app = {
    status:'Final Round Interview',
    application_timeline:[
      {status_change:'3rd Round Interview'},
      {status_change:'Final Round Interview'},
      {status_change:'2nd Round Interview'},
    ]
  };
  assert.equal(nextNumberedInterviewRound(app),'4th Round Interview');
  assert.equal(nextNumberedInterviewRound({
    status:'2nd Round Interview',
    application_timeline:[{status_change:'10th Round Interview'}]
  }),'11th Round Interview');
  assert.equal(nextNumberedInterviewRound({
    status:'Final Round Interview',
    application_timeline:[]
  }),'1st Round Interview');
  assert.equal(nextNumberedInterviewRound({status:'Shortlisted',application_timeline:null}),
    '1st Round Interview');
  assert.equal(nextNumberedInterviewRound({
    status:'3rd Round Interview',
    application_timeline:[{status_change:'4st Round Interview'}, {status_change:'nan Round Interview'}]
  }),'4th Round Interview');
});

test('final checkbox overrides only the selected round, not the next numbered round', () => {
  const numbered = nextNumberedInterviewRound({status:'7th Round Interview'});
  assert.equal(selectedInterviewRound(numbered,false),'8th Round Interview');
  assert.equal(selectedInterviewRound(numbered,true),'Final Round Interview');
  assert.equal(selectedInterviewRound(numbered,false),'8th Round Interview');
});

test('Recruitment dialog uses an explicit unchecked-by-default checkbox', () => {
  const source = readFileSync(new URL('../frontend/src/pages/AdminRecruitment.jsx', import.meta.url),'utf8');
  assert.match(source,/This is the final interview round/);
  assert.match(source,/checked=\{interviewData\.isFinalRound\}/);
  assert.match(source,/isFinalRound:\s*false/);
  assert.match(source,/onChange=\{e => setInterviewData\(previous => \(\{ \.\.\.previous, isFinalRound: e\.target\.checked \}\)\)\}/);
  assert.match(source,/newStatus:\s*scheduledInterviewStatus/);
  assert.match(source,/nextNumberedInterviewRound\(app\)/);
  assert.doesNotMatch(source,/status === '3rd Round Interview'\) return 'Final Round Interview'/);
});
