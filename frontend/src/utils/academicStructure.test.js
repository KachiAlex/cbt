import { describe, expect, it } from 'vitest';
import { getAcademicStructure } from './academicStructure';

describe('getAcademicStructure', () => {
  it('defaults existing institutions to optional departments and Level labels', () => {
    expect(getAcademicStructure({ settings: {} })).toEqual({
      departmentMode: 'optional',
      departmentsEnabled: true,
      departmentsRequired: false,
      levelLabel: 'Level',
    });
  });

  it('supports secondary-school mode without departments', () => {
    expect(getAcademicStructure({ settings: { departmentMode: 'disabled', levelLabel: ' Class ' } })).toEqual({
      departmentMode: 'disabled',
      departmentsEnabled: false,
      departmentsRequired: false,
      levelLabel: 'Class',
    });
  });

  it('supports required departments', () => {
    expect(getAcademicStructure({ settings: { departmentMode: 'required' } }).departmentsRequired).toBe(true);
  });

  it('falls back for invalid values', () => {
    expect(getAcademicStructure({ settings: { departmentMode: 'bogus', levelLabel: '' } })).toEqual({
      departmentMode: 'optional',
      departmentsEnabled: true,
      departmentsRequired: false,
      levelLabel: 'Level',
    });
  });
});
