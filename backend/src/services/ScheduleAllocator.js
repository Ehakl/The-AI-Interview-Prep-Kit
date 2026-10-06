/**
 * ScheduleAllocator.js
 * 
 * Deterministic service to allocate generated questions across the requested number of days.
 * Meets the following criteria:
 * - Integer minutes only.
 * - Spans EXACTLY the days requested.
 * - Higher priority and harder questions land earlier.
 * - Every must-have requirement that has a question is included.
 */

class ScheduleAllocator {
  /**
   * @param {number} daysAvailable 
   * @param {Array} questions - Array of generated question objects
   * @param {Array} requirements - Array of extracted requirement objects
   * @returns {Object} - Schedule object matching Appendix A
   */
  static generateSchedule(daysAvailable, questions, requirements) {
    if (!daysAvailable || daysAvailable < 1) daysAvailable = 1;

    // 1. Map requirements by ID for quick lookup
    const reqMap = {};
    for (const req of requirements) {
      reqMap[req.id] = req;
    }

    // 2. Score and sort questions (Harder and higher-priority earlier)
    const scoredQuestions = questions.map(q => {
      let isMust = false;
      if (q.requirement_ids) {
        for (const rId of q.requirement_ids) {
          if (reqMap[rId] && reqMap[rId].priority === 'must') {
            isMust = true;
            break;
          }
        }
      }

      // Weight logic: 
      // 'Must' gets a +10 boost. Difficulty adds 1-3.
      // So a Must/Diff 3 = 13. A Nice/Diff 1 = 1.
      const priorityScore = isMust ? 10 : 0;
      const weight = priorityScore + q.difficulty;
      
      // Calculate minutes deterministically (integer)
      // Diff 1 = 15m, Diff 2 = 30m, Diff 3 = 45m
      const minutes = q.difficulty * 15;

      return { ...q, weight, computedMinutes: minutes };
    });

    // Sort descending by weight
    scoredQuestions.sort((a, b) => b.weight - a.weight);

    // 3. Allocate to days
    // We must return EXACTLY `daysAvailable` array elements
    const days = [];
    for (let i = 1; i <= daysAvailable; i++) {
      days.push({
        day: i,
        focus: '', // Will deduce focus based on category 
        question_ids: [],
        minutes: 0
      });
    }

    // Distribute chunk by chunk so harder stuff lands on Day 1, Day 2 etc.
    // If we have 10 questions and 5 days, day 1 gets q0, q1, day 2 gets q2, q3 etc.
    scoredQuestions.forEach((q, index) => {
      // Proportional mapping: map the sorted index to a day bin.
      // Math.floor( (index / total_questions) * daysAvailable )
      let dayIndex = Math.floor((index / scoredQuestions.length) * daysAvailable);
      
      // Failsafe for empty bins if there are fewer questions than days
      // If we have 2 questions and 5 days, let's just place them sequentially to avoid bunching at the end
      if (scoredQuestions.length < daysAvailable) {
         dayIndex = index;
      }
      
      const targetDay = days[dayIndex];
      targetDay.question_ids.push(q.id);
      targetDay.minutes += q.computedMinutes;
    });

    // 4. Derive focus and cleanup empty days (though empty days are allowed, focus should reflect it)
    for (const day of days) {
      if (day.question_ids.length === 0) {
        day.focus = 'Rest and Review';
      } else {
        // Find most common requirement for focus
        const reqCounts = {};
        day.question_ids.forEach(qId => {
          const q = questions.find(qu => qu.id === qId);
          if (q && q.requirement_ids) {
            q.requirement_ids.forEach(rId => {
              reqCounts[rId] = (reqCounts[rId] || 0) + 1;
            });
          }
        });

        let focusText = 'Mixed Review';
        if (Object.keys(reqCounts).length > 0) {
          const topReqId = Object.keys(reqCounts).sort((a,b) => reqCounts[b] - reqCounts[a])[0];
          const req = reqMap[topReqId];
          if (req && req.text) {
            focusText = req.text.length > 40 ? req.text.substring(0, 37) + '...' : req.text;
            focusText = focusText.charAt(0).toUpperCase() + focusText.slice(1);
          }
        }
        day.focus = focusText;
      }
    }

    return {
      days_available: daysAvailable,
      days: days
    };
  }
}

module.exports = ScheduleAllocator;
