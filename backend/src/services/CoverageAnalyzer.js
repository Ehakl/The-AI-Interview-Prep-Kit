/**
 * CoverageAnalyzer.js
 * 
 * Deterministic service to calculate which requirements have not been covered
 * by the currently generated questions. This prevents LLM hallucination
 * and provides strict gap analysis for the multi-pass generation loop.
 */

class CoverageAnalyzer {
  /**
   * @param {Array} requirements - Extracted requirement objects
   * @param {Array} questions - Generated question objects
   * @returns {Object} Analysis results
   */
  static analyze(requirements, questions) {
    const coveredIds = new Set();
    
    // Collect all requirement IDs that have at least one question associated
    (questions || []).forEach(q => {
      if (q.requirement_ids && Array.isArray(q.requirement_ids)) {
        q.requirement_ids.forEach(id => coveredIds.add(id));
      }
    });

    const uncoveredAll = [];
    const uncoveredMusts = [];

    // Check which requirements missed out
    (requirements || []).forEach(req => {
      if (!coveredIds.has(req.id)) {
        uncoveredAll.push(req.id);
        if (req.priority === 'must') {
          uncoveredMusts.push(req.id);
        }
      }
    });

    return {
      uncovered_requirement_ids: uncoveredAll,
      uncovered_must_ids: uncoveredMusts,
      is_full_must_coverage: uncoveredMusts.length === 0
    };
  }
}

module.exports = CoverageAnalyzer;
