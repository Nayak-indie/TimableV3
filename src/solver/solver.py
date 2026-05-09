import sys
import json
from typing import Dict, List, Tuple, Optional
from ortools.sat.python import cp_model

def solve():
    # Read input from stdin
    try:
        input_data = json.load(sys.stdin)
    except Exception as e:
        print(json.dumps({"error": f"Failed to parse input JSON: {str(e)}"}))
        return

    config = input_data.get("config", {})
    teachers = input_data.get("teachers", [])
    classes = input_data.get("classes", [])
    prerequisites = input_data.get("prerequisites", {})
    preferences = input_data.get("preferences", {})

    days = config.get("days", ["Mon", "Tue", "Wed", "Thu", "Fri"])
    num_days = len(days)
    num_periods = config.get("periods_per_day", 8)
    
    model = cp_model.CpModel()
    
    # Variables: assign[class_id, subject_id, day, period]
    assign = {}
    class_subject_info = {} # (class_id, subject_id) -> teacher_id
    
    for cls in classes:
        cid = cls["id"]
        for subj in cls["subjects"]:
            sid = subj["subject"]
            tid = subj["teacher_id"]
            class_subject_info[(cid, sid)] = tid
            for d in range(num_days):
                for p in range(num_periods):
                    assign[(cid, sid, d, p)] = model.NewBoolVar(f'assign_{cid}_{sid}_{d}_{p}')

    # 1. Each class has at most one subject per period
    for cls in classes:
        cid = cls["id"]
        for d in range(num_days):
            for p in range(num_periods):
                model.AddAtMostOne(assign[(cid, sid, d, p)] for sid in [s["subject"] for s in cls["subjects"]])

    # 2. Each teacher can only be in one class at a time
    for teacher in teachers:
        tid = teacher["id"]
        for d in range(num_days):
            for p in range(num_periods):
                relevant_vars = []
                for (cid, sid), assigned_tid in class_subject_info.items():
                    if assigned_tid == tid:
                        relevant_vars.append(assign[(cid, sid, d, p)])
                model.AddAtMostOne(relevant_vars)

    # 3. Weekly periods requirement
    for cls in classes:
        cid = cls["id"]
        for subj in cls["subjects"]:
            sid = subj["subject"]
            required = subj["weekly_periods"]
            model.Add(sum(assign[(cid, sid, d, p)] for d in range(num_days) for p in range(num_periods)) == required)

    # 4. Teacher Daily Cap
    for teacher in teachers:
        tid = teacher["id"]
        max_daily = teacher.get("max_periods_per_day", num_periods)
        for d in range(num_days):
            relevant_vars = []
            for (cid, sid), assigned_tid in class_subject_info.items():
                if assigned_tid == tid:
                    for p in range(num_periods):
                        relevant_vars.append(assign[(cid, sid, d, p)])
            model.Add(sum(relevant_vars) <= max_daily)

    # 5. Teacher Preferences (Availability)
    for tid, pref in preferences.items():
        # unavailable_periods: { "0": [0, 1], "1": [4] }
        unavail = pref.get("unavailable_periods", {})
        for day_idx_str, periods in unavail.items():
            d_idx = int(day_idx_str)
            if d_idx >= num_days: continue
            for p_idx in periods:
                if p_idx >= num_periods: continue
                # Set all variables for this teacher at this time to 0
                for (cid, sid), assigned_tid in class_subject_info.items():
                    if assigned_tid == tid:
                        model.Add(assign[(cid, sid, d_idx, p_idx)] == 0)

    # 6. Subject Prerequisites (Within the same week)
    # prerequisites: { "class_id": { "Physics": ["Math"] } }
    for cid, class_prereqs in prerequisites.items():
        for dependent, prereq_list in class_prereqs.items():
            for prereq in prereq_list:
                # dependent must come AFTER prereq in the week
                # This is a bit tricky. A simple version: index(prereq) < index(dependent)
                # But since they can have multiple periods, we ensure the FIRST period of dependent
                # is after at least ONE period of prereq, or similar.
                # More robust: for every period of dependent, there must be at least one period of prereq before it.
                for d_dep in range(num_days):
                    for p_dep in range(num_periods):
                        # If dependent is at (d_dep, p_dep), then prereq must have occurred at some (d_pre, p_pre) where d_pre*num_p + p_pre < d_dep*num_p + p_dep
                        pre_vars = []
                        for d_pre in range(num_days):
                            for p_pre in range(num_periods):
                                if (d_pre * num_periods + p_pre) < (d_dep * num_periods + p_dep):
                                    if (cid, prereq, d_pre, p_pre) in assign:
                                        pre_vars.append(assign[(cid, prereq, d_pre, p_pre)])
                        
                        if pre_vars:
                            # dependent[d,p] => OR(pre_vars)
                            # Implies: assign[dep] <= sum(pre_vars)
                            model.Add(assign[(cid, dependent, d_dep, p_dep)] <= sum(pre_vars))

    # 7. Objectives & Soft Constraints
    obj_terms = []
    
    # 7.1 Preferred periods bonus
    for tid, pref in preferences.items():
        preferred = pref.get("preferred_periods", {})
        for day_idx_str, periods in preferred.items():
            d_idx = int(day_idx_str)
            if d_idx >= num_days: continue
            for p_idx in periods:
                if p_idx >= num_periods: continue
                for (cid, sid), assigned_tid in class_subject_info.items():
                    if assigned_tid == tid:
                        obj_terms.append(assign[(cid, sid, d_idx, p_idx)] * 10)

    # 7.2 Load Balancing: Try to make daily loads equal
    # For each teacher, target = total_weekly / num_days
    for teacher in teachers:
        tid = teacher["id"]
        total_weekly = sum(s["weekly_periods"] for c in classes for s in c["subjects"] if s["teacher_id"] == tid)
        if total_weekly == 0: continue
        target_avg = total_weekly // num_days
        
        for d in range(num_days):
            daily_vars = []
            for (cid, sid), assigned_tid in class_subject_info.items():
                if assigned_tid == tid:
                    for p in range(num_periods):
                        daily_vars.append(assign[(cid, sid, d, p)])
            
            # Minimize absolute difference from target_avg
            # diff = model.NewIntVar(-num_periods, num_periods, f'diff_{tid}_{d}')
            # model.Add(diff == sum(daily_vars) - target_avg)
            # abs_diff = model.NewIntVar(0, num_periods, f'abs_diff_{tid}_{d}')
            # model.AddAbsEquality(abs_diff, diff)
            # obj_terms.append(abs_diff * -5) # Negative weight because we want to minimize it
            
            # Simple version: favor days that are currently under-loaded (hard to do in one pass)
            # Better: Penalize very high daily loads even if they are below the hard cap
            model.Add(sum(daily_vars) <= target_avg + 2) # Soft cap

    # 7.3 Minimize Gaps (Consecutive periods)
    # We prefer periods that are next to each other to minimize teacher "waiting"
    for teacher in teachers:
        tid = teacher["id"]
        for d in range(num_days):
            for p in range(num_periods - 1):
                # If a teacher is teaching in both P and P+1, give a small bonus
                # This is represented by a new boolean: both_active = P AND P+1
                # both_active <= P, both_active <= P+1, both_active >= P + P+1 - 1
                p_active = []
                p_next_active = []
                for (cid, sid), assigned_tid in class_subject_info.items():
                    if assigned_tid == tid:
                        p_active.append(assign[(cid, sid, d, p)])
                        p_next_active.append(assign[(cid, sid, d, p+1)])
                
                if p_active and p_next_active:
                    is_p_active = model.NewBoolVar(f'is_p_active_{tid}_{d}_{p}')
                    is_p_next_active = model.NewBoolVar(f'is_p_next_active_{tid}_{d}_{p}')
                    model.Add(is_p_active == sum(p_active))
                    model.Add(is_p_next_active == sum(p_next_active))
                    
                    consecutive = model.NewBoolVar(f'consecutive_{tid}_{d}_{p}')
                    model.Add(consecutive <= is_p_active)
                    model.Add(consecutive <= is_p_next_active)
                    model.Add(consecutive >= is_p_active + is_p_next_active - 1)
                    obj_terms.append(consecutive * 2)

    model.Maximize(sum(obj_terms))

    # Solver
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30.0
    status = solver.Solve(model)

    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        timetable = []
        for (cid, sid, d, p), var in assign.items():
            if solver.Value(var) == 1:
                timetable.append({
                    "class_id": cid,
                    "subject_id": sid,
                    "teacher_id": class_subject_info[(cid, sid)],
                    "day": days[d],
                    "period": p + 1
                })
        print(json.dumps({"status": "SUCCESS", "timetable": timetable}))
    else:
        print(json.dumps({"status": "INFEASIBLE"}))

if __name__ == "__main__":
    solve()
