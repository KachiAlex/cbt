const DEPARTMENT_MODES = new Set(['disabled', 'optional', 'required']);

export function getAcademicStructure(institution) {
  const source = institution?.settings || institution || {};
  const departmentMode = DEPARTMENT_MODES.has(source.departmentMode)
    ? source.departmentMode
    : 'optional';
  const levelLabel = typeof source.levelLabel === 'string' && source.levelLabel.trim()
    ? source.levelLabel.trim()
    : 'Level';

  return {
    departmentMode,
    departmentsEnabled: departmentMode !== 'disabled',
    departmentsRequired: departmentMode === 'required',
    levelLabel,
  };
}
