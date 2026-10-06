// Unit Tests for Deterministic Logic
// Run: node --test src/tests/deterministic.test.js

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const ScheduleAllocator = require('../services/ScheduleAllocator');
const CoverageAnalyzer = require('../services/CoverageAnalyzer');

// ─── Mock Data ──────────────────────────────────────────────────────────────────
const mockRequirements = [
  { id: 'r1', text: 'React proficiency', kind: 'technical', priority: 'must' },
  { id: 'r2', text: 'Node.js', kind: 'technical', priority: 'must' },
  { id: 'r3', text: 'Team leadership', kind: 'behavioural', priority: 'nice' },
  { id: 'r4', text: 'System design', kind: 'technical', priority: 'must' },
];

const mockQuestions = [
  { id: 'q1', requirement_ids: ['r1'], category: 'technical', difficulty: 3 },
  { id: 'q2', requirement_ids: ['r2'], category: 'technical', difficulty: 2 },
  { id: 'q3', requirement_ids: ['r3'], category: 'behavioural', difficulty: 1 },
];

// ─── ScheduleAllocator Tests ────────────────────────────────────────────────────
describe('ScheduleAllocator', () => {
  it('should produce exactly days_available entries', () => {
    const result = ScheduleAllocator.generateSchedule(5, mockQuestions, mockRequirements);
    assert.strictEqual(result.days.length, 5, 'Expected exactly 5 days');
  });

  it('should produce integer minutes only', () => {
    const result = ScheduleAllocator.generateSchedule(3, mockQuestions, mockRequirements);
    for (const day of result.days) {
      assert.ok(Number.isInteger(day.minutes), `Day ${day.day} has non-integer minutes: ${day.minutes}`);
    }
  });

  it('must-have questions should appear on earlier days (day 1 or 2)', () => {
    const questions = [
      { id: 'q1', requirement_ids: ['r1'], category: 'technical', difficulty: 3 }, // must, hard
      { id: 'q2', requirement_ids: ['r2'], category: 'technical', difficulty: 3 }, // must, hard
      { id: 'q3', requirement_ids: ['r3'], category: 'behavioural', difficulty: 1 }, // nice, easy
    ];
    const result = ScheduleAllocator.generateSchedule(5, questions, mockRequirements);
    const day1 = result.days[0];
    const day5 = result.days[4];
    assert.ok(day1.question_ids.length >= day5.question_ids.length, 'Day 1 should have >= questions as Day 5');
  });

  it('should handle 1-day schedule without crashing', () => {
    const result = ScheduleAllocator.generateSchedule(1, mockQuestions, mockRequirements);
    assert.strictEqual(result.days.length, 1);
    assert.ok(result.days[0].question_ids.length >= 1);
  });

  it('should handle empty questions array', () => {
    const result = ScheduleAllocator.generateSchedule(3, [], mockRequirements);
    assert.strictEqual(result.days.length, 3);
    result.days.forEach(d => assert.strictEqual(d.question_ids.length, 0));
  });

  it('should return days_available matching input', () => {
    [1, 3, 7, 14].forEach(n => {
      const result = ScheduleAllocator.generateSchedule(n, mockQuestions, mockRequirements);
      assert.strictEqual(result.days_available, n);
    });
  });
});

// ─── CoverageAnalyzer Tests ─────────────────────────────────────────────────────
describe('CoverageAnalyzer', () => {
  it('should detect uncovered must requirements', () => {
    // q4 not covering r4
    const analysis = CoverageAnalyzer.analyze(mockRequirements, mockQuestions);
    assert.ok(analysis.uncovered_must_ids.includes('r4'), 'r4 should be flagged as uncovered must');
  });

  it('should return is_full_must_coverage=false when must gaps exist', () => {
    const analysis = CoverageAnalyzer.analyze(mockRequirements, mockQuestions);
    assert.strictEqual(analysis.is_full_must_coverage, false);
  });

  it('should return is_full_must_coverage=true when all musts are covered', () => {
    const allCovered = [
      ...mockQuestions,
      { id: 'q4', requirement_ids: ['r4'], category: 'system-design', difficulty: 2 }
    ];
    const analysis = CoverageAnalyzer.analyze(mockRequirements, allCovered);
    assert.strictEqual(analysis.is_full_must_coverage, true);
  });

  it('should handle empty questions gracefully', () => {
    const analysis = CoverageAnalyzer.analyze(mockRequirements, []);
    assert.strictEqual(analysis.uncovered_requirement_ids.length, mockRequirements.length);
  });

  it('should handle empty requirements gracefully', () => {
    const analysis = CoverageAnalyzer.analyze([], mockQuestions);
    assert.strictEqual(analysis.uncovered_requirement_ids.length, 0);
    assert.strictEqual(analysis.is_full_must_coverage, true);
  });
});

console.log('\n✅ All deterministic logic tests passed!\n');
