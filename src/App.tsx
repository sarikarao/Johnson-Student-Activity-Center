import React, { ChangeEvent, useMemo, useState } from 'react';
import './App.css';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';
import { format, parseISO, isValid as isValidDate } from 'date-fns';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

type Nullable<T> = T | null | undefined;

interface StudentRecord {
  firstName?: string;
  lastName?: string;
  studentName?: string;
  schoolName?: string;
  homeZipCode?: string;
  county?: string;
  grade?: string;
  gender?: string;
  age?: number | null;
  firstVisitDate?: Date | null;
  yearsWithJsac?: number | null;
  heardAbout?: string;
  siblings?: number | null;
  parentsGuardians?: number | null;
  careerInterest?: string;
  hobbies?: string;
  visitsPastMonth?: number | null;
  visitsPastQuarter?: number | null;
  visitsPastYear?: number | null;
  checkInDates?: Date[];
  isAdult?: boolean | null;
  teamName?: string;
  teamNumber?: number | null;
  email?: string;
  checkedIn?: boolean | null;
  checkedOut?: boolean | null;
  checkInDate?: Date | null;
  checkOutDate?: Date | null;
  elapsedTime?: number | null;
}

type ColumnKey = keyof StudentRecord;

const normalizeHeaderKey = (key: string) =>
  key
    .toLowerCase()
    .replace(/\r?\n+/g, ' ')
    .replace(/\(.*?\)/g, '')
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9?]+/g, '')
    .trim();

const columnMap: Record<string, ColumnKey> = {
  name: 'studentName',
  schoolname: 'schoolName',
  homezipcode: 'homeZipCode',
  county: 'county',
  grade: 'grade',
  gender: 'gender',
  age: 'age',
  dateoffirstvisit: 'firstVisitDate',
  numberofsiblings: 'siblings',
  numberofparentsinhousehold: 'parentsGuardians',
  careerinterest: 'careerInterest',
  hobbies: 'hobbies',
  'adult?': 'isAdult',
  teamname: 'teamName',
  teamnumber: 'teamNumber',
  email: 'email',
  checkedin: 'checkedIn',
  checkedout: 'checkedOut',
  checkindate: 'checkInDate',
  checkoutdate: 'checkOutDate',
  elapsedtime: 'elapsedTime',
};

// rely solely on columnMap for what we parse; no explicit ignore list

const colorPalette = [
  '#2563eb',
  '#16a34a',
  '#db2777',
  '#f59e0b',
  '#0ea5e9',
  '#84cc16',
  '#f97316',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
  '#a855f7',
  '#94a3b8',
];

const getPalette = (count: number) => {
  if (count <= colorPalette.length) {
    return colorPalette.slice(0, count);
  }
  return Array.from(
    { length: count },
    (_, index) => colorPalette[index % colorPalette.length]
  );
};

const parseNumber = (value: Nullable<unknown>): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const parseBooleanFlag = (value: Nullable<unknown>): boolean | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    if (['y', 'yes', 'true', 'adult'].includes(normalized)) {
      return true;
    }
    if (['n', 'no', 'false', 'youth', 'child'].includes(normalized)) {
      return false;
    }
  }
  return null;
};

const hasText = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (typeof value === 'number') {
    return !Number.isNaN(value);
  }
  return true;
};

const parseDateValue = (value: Nullable<unknown>): Date | null => {
  if (!value && value !== 0) {
    return null;
  }
  if (value instanceof Date && isValidDate(value)) {
    return value;
  }
  if (typeof value === 'number') {
    const excelDate = XLSX.SSF.parse_date_code(value);
    if (excelDate) {
      return new Date(excelDate.y, excelDate.m - 1, excelDate.d);
    }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    // Handle format: YYYY-MM-DD HH:MMAM -04:00 (AM/PM with timezone offset)
    const m = trimmed.match(
      /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s*([AP]M)\s+([+-])(\d{2}):(\d{2})$/i
    );
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]);
      const day = Number(m[3]);
      let hour = Number(m[4]);
      const minute = Number(m[5]);
      const ampm = m[6].toUpperCase();
      const sign = m[7] === '+' ? 1 : -1;
      const tzH = Number(m[8]);
      const tzM = Number(m[9]);

      hour = ampm === 'AM' ? hour % 12 : (hour % 12) + 12;
      const localUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
      const offsetMinutes = sign * (tzH * 60 + tzM);
      const utcMs = localUtcMs - offsetMinutes * 60 * 1000;
      const d = new Date(utcMs);
      return isValidDate(d) ? d : null;
    }
    const isoCandidate = parseISO(trimmed);
    if (isValidDate(isoCandidate)) {
      return isoCandidate;
    }
    const parsed = new Date(trimmed);
    if (isValidDate(parsed)) {
      return parsed;
    }
  }
  return null;
};

// simplified: use singular checkInDate field per columnMap

// removed meta phrases filtering for simplicity

const parseRow = (row: Record<string, unknown>): StudentRecord | null => {
  const record: StudentRecord = {};
  let hasMappedValue = false;

  Object.entries(row).forEach(([key, rawValue]) => {
    const normalizedKey = normalizeHeaderKey(key.trim());
    if (!normalizedKey) {
      return;
    }
    console.log(normalizedKey);
    const mappedKey = columnMap[normalizedKey];

    if (!mappedKey) {
      return;
    }

    switch (mappedKey) {
      case 'checkedIn':
      case 'checkedOut':
        record[mappedKey] = parseBooleanFlag(rawValue);
        if (record[mappedKey] !== null) {
          hasMappedValue = true;
        }
        break;
      case 'age':
      case 'siblings':
      case 'parentsGuardians':
      case 'yearsWithJsac':
      case 'visitsPastMonth':
      case 'visitsPastQuarter':
      case 'visitsPastYear':
        record[mappedKey] = parseNumber(rawValue);
        if (record[mappedKey] !== null) {
          hasMappedValue = true;
        }
        break;
      case 'firstVisitDate':
        record[mappedKey] = parseDateValue(rawValue);
        if (record[mappedKey]) {
          hasMappedValue = true;
        }
        break;
      case 'checkInDate':
      case 'checkOutDate':
        record[mappedKey] = parseDateValue(rawValue);
        if (record[mappedKey]) {
          hasMappedValue = true;
        }
        break;
      case 'isAdult':
        record[mappedKey] = parseBooleanFlag(rawValue);
        if (record[mappedKey] !== null) {
          hasMappedValue = true;
        }
        break;
      case 'email':
        record[mappedKey] = String(rawValue).trim();
        if (record[mappedKey]) {
          hasMappedValue = true;
        }
        break;
      case 'elapsedTime':
        record[mappedKey] = parseNumber(rawValue);
        if (record[mappedKey] !== null) {
          hasMappedValue = true;
        }
        break;
      default:
        record[mappedKey] =
          rawValue === undefined || rawValue === null
            ? undefined
            : String(rawValue).trim();
        if (record[mappedKey]) {
          hasMappedValue = true;
        }
    }
  });

  if (!record.studentName) {
    const composite = [record.firstName, record.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (composite) {
      record.studentName = composite;
    }
  }

  return hasMappedValue ? record : null;
};

// removed unused countByField helper

const buildBarData = (
  counts: Record<string, number>,
  label: string
): ChartData<'bar'> => ({
  labels: Object.keys(counts),
  datasets: [
    {
      label,
      data: Object.values(counts),
      backgroundColor: getPalette(Object.keys(counts).length),
    },
  ],
});

const buildPieData = (
  counts: Record<string, number>,
  label: string
): ChartData<'pie'> => ({
  labels: Object.keys(counts),
  datasets: [
    {
      label,
      data: Object.values(counts),
      backgroundColor: getPalette(Object.keys(counts).length),
      borderWidth: 1,
    },
  ],
});

const defaultBarOptions: ChartOptions<'bar'> = {
  responsive: true,
  plugins: {
    legend: {
      position: 'bottom',
    },
  },
  scales: {
    x: {
      ticks: {
        maxRotation: 45,
        minRotation: 0,
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
};

// removed unused defaultLineOptions

// Format date+time similar to App.tsx (US locale, concise)
const formatDateTime = (d: Date): string =>
  d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const App: React.FC = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  // simplified: no unmapped headers tracking
  const [selectedRecordKey, setSelectedRecordKey] = useState<string>('');
  const [selectedRecordName, setSelectedRecordName] = useState<string>('');

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const data = uploadEvent.target?.result;
      if (!data) {
        setError('Unable to read the selected file.');
        return;
      }

      try {
        const workbook = XLSX.read(data, {
          type: data instanceof ArrayBuffer ? 'array' : 'binary',
        });
        const [firstSheetName] = workbook.SheetNames;
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) {
          throw new Error('No sheets found in workbook.');
        }

        const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
          header: 1,
          defval: null,
          raw: true,
          blankrows: false,
        });

        if (!Array.isArray(rows) || rows.length === 0) {
          throw new Error('No rows detected in sheet.');
        }

        let bestHeaderIndex = 0;
        let bestScore = -1;

        rows.forEach((row: unknown[], index: number) => {
          if (!Array.isArray(row)) {
            return;
          }
          const labels = row
            .map((cell: unknown) =>
              typeof cell === 'string' || typeof cell === 'number'
                ? String(cell).trim()
                : ''
            )
            .filter(Boolean);
          if (labels.length === 0) {
            return;
          }

          const score = labels.reduce((count, label) => {
            const normalized = normalizeHeaderKey(label);
            if (!normalized) {
              return count;
            }
            return columnMap[normalized] ? count + 1 : count;
          }, 0);

          if (score > bestScore && score >= 2) {
            bestScore = score;
            bestHeaderIndex = index;
          }
        });

        const headerRow = (rows[bestHeaderIndex] ?? []) as unknown[];
        const headerLabels = headerRow.map((cell: unknown) =>
          typeof cell === 'string' || typeof cell === 'number'
            ? String(cell).trim()
            : ''
        );

        const dataRows = rows.slice(bestHeaderIndex + 1);

        const rawRecords: Record<string, unknown>[] = dataRows
          .filter(
            (row) => Array.isArray(row) && row.some((cell) => hasText(cell))
          )
          .map((row: unknown[]) => {
            const record: Record<string, unknown> = {};
            headerLabels.forEach((header: string, columnIndex: number) => {
              if (!header) {
                return;
              }
              const value = Array.isArray(row) ? row[columnIndex] : undefined;
              if (value !== undefined) {
                record[header] = value;
              }
            });
            return record;
          })
          .filter((record: Record<string, unknown>) =>
            Object.values(record).some((value: unknown) => hasText(value))
          );
        console.log(rawRecords);
        const parsed = rawRecords
          .map((row) => parseRow(row))
          .filter((row): row is StudentRecord => row !== null);
        console.log(parsed);
        setStudents(parsed);
        setError(null);
      } catch (parseError) {
        console.error(parseError);
        setError(
          'Failed to parse the Excel file. Please verify the template and try again.'
        );
        setStudents([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Build unique profiles keyed by name+age+school+county, similar to metrics.ts
  type Profile = {
    name?: string;
    county?: string;
    homeZipCode?: string;
    schoolName?: string;
    age?: number | null;
    grade?: string;
    gender?: string;
  };
  const uniqueProfiles = useMemo(() => {
    // Only include rows with name AND a valid check-in date
    const map = new Map<string, Profile>();
    students.forEach((s: StudentRecord) => {
      const name = (
        s.studentName || `${s.firstName ?? ''} ${s.lastName ?? ''}`
      ).trim();
      const ci = s.checkInDate;
      if (!name || !ci || !isValidDate(ci)) return;
      const key = `${name.toLowerCase()}|${
        s.age == null ? '' : String(s.age).trim().toLowerCase()
      }|${s.age ?? ''}|${s.teamName ?? ''}|${s.teamNumber ?? ''}`;
      if (!key.replace(/\|/g, '')) return;
      if (!map.has(key)) {
        map.set(key, {
          name,
          county: s.county,
          homeZipCode: s.homeZipCode,
          schoolName: s.schoolName,
          age: s.age,
          grade: s.grade,
          gender: s.gender,
        });
      }
    });
    return map;
  }, [students]);

  const uniqueStudentsCount = useMemo(
    () => uniqueProfiles.size,
    [uniqueProfiles]
  );

  // Counts derived from unique profiles
  const countyCounts = useMemo(() => {
    const bucket: Record<string, number> = {};
    uniqueProfiles.forEach((p: Profile) => {
      const key = p.county;
      if (!key) return; // skip unknowns
      const k = String(key);
      bucket[k] = (bucket[k] || 0) + 1;
    });
    return bucket;
  }, [uniqueProfiles]);
  const gradeCounts = useMemo(() => {
    const bucket: Record<string, number> = {};
    uniqueProfiles.forEach((p: Profile) => {
      const key = p.grade;
      if (!key) return;
      const k = String(key);
      bucket[k] = (bucket[k] || 0) + 1;
    });
    return bucket;
  }, [uniqueProfiles]);
  const genderCounts = useMemo(() => {
    const bucket: Record<string, number> = {};
    uniqueProfiles.forEach((p: Profile) => {
      const key = p.gender;
      if (!key) return;
      const k = String(key);
      bucket[k] = (bucket[k] || 0) + 1;
    });
    return bucket;
  }, [uniqueProfiles]);
  const zipCounts = useMemo(() => {
    const bucket: Record<string, number> = {};
    uniqueProfiles.forEach((p: Profile) => {
      const key = p.homeZipCode;
      if (!key) return;
      const k = String(key);
      bucket[k] = (bucket[k] || 0) + 1;
    });
    return bucket;
  }, [uniqueProfiles]);
  const schoolCounts = useMemo(() => {
    const bucket: Record<string, number> = {};
    uniqueProfiles.forEach((p: Profile) => {
      const key = p.schoolName;
      if (!key) return;
      const k = String(key);
      bucket[k] = (bucket[k] || 0) + 1;
    });
    return bucket;
  }, [uniqueProfiles]);
  const ageCounts = useMemo(() => {
    const bucket: Record<string, number> = {};
    uniqueProfiles.forEach((p: Profile) => {
      const key = p.age;
      if (key == null) return;
      const k = String(key);
      bucket[k] = (bucket[k] || 0) + 1;
    });
    return bucket;
  }, [uniqueProfiles]);

  // totalStudents not used

  const totalCheckIns = useMemo(() => {
    // Count rows that have: name + checked in + valid check-in date
    return students.filter((record: StudentRecord) => {
      const name = (
        record.studentName ||
        `${record.firstName ?? ''} ${record.lastName ?? ''}`
      ).trim();
      const hasName = Boolean(name);
      const checkedIn = record.checkedIn === true;
      const ci = record.checkInDate;
      const hasCheckInDate = !!ci && isValidDate(ci);
      return hasName && checkedIn && hasCheckInDate;
    }).length;
  }, [students]);

  // Match metrics.ts formatting
  const fmtMonth = (d: Date): string =>
    d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const monthCounts = useMemo(() => {
    // Count by yyyy-MM for stable chronological sorting, label with fmtMonth
    const monthMap = new Map<string, number>(); // key: yyyy-MM
    const addDate = (date: Date) => {
      if (!isValidDate(date)) return;
      const ym = format(date, 'yyyy-MM');
      monthMap.set(ym, (monthMap.get(ym) ?? 0) + 1);
    };
    students.forEach((record) => {
      if (record.checkInDate) {
        addDate(record.checkInDate);
      }
    });
    const ordered: Record<string, number> = {};
    const sorted = Array.from(monthMap.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    sorted.forEach(([ym, count]) => {
      const d = parseISO(`${ym}-01`);
      const label = isValidDate(d) ? fmtMonth(d) : ym;
      ordered[label] = count;
    });
    return ordered;
  }, [students]);

  const getWeekRange = (d: Date): string => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 1 - dayNum);
    const start = new Date(date);
    const end = new Date(date);
    end.setUTCDate(end.getUTCDate() + 6);
    const fmt = (dt: Date) =>
      `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}/${dt.getUTCFullYear()}`;
    return `${fmt(start)} - ${fmt(end)}`;
  };

  const weekCounts = useMemo(() => {
    // Count by week start (UTC) for chronological sorting, label with getWeekRange
    const weekMap = new Map<number, number>(); // key: weekStartMs (UTC)
    const weekStartMs = (d: Date): number => {
      const date = new Date(
        Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
      );
      const dayNum = date.getUTCDay() || 7; // Sunday -> 7
      date.setUTCDate(date.getUTCDate() + 1 - dayNum); // set to Sunday
      return date.getTime();
    };
    const addDate = (date: Date) => {
      if (!isValidDate(date)) return;
      const key = weekStartMs(date);
      weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
    };
    students.forEach((record) => {
      if (record.checkInDate) {
        addDate(record.checkInDate);
      }
    });
    const ordered: Record<string, number> = {};
    const sorted = Array.from(weekMap.entries()).sort(([a], [b]) => a - b);
    sorted.forEach(([ms, count]) => {
      const label = getWeekRange(new Date(ms));
      ordered[label] = count;
    });
    return ordered;
  }, [students]);

  // removed unused checkInsByMonth transformation

  // removed unused lineData for simplicity

  // removed unused barDataFromCounts

  const [modeMonth, setModeMonth] = useState<'table' | 'chart'>('table');
  const [modeWeek, setModeWeek] = useState<'table' | 'chart'>('table');

  const [selectedActiveId, setSelectedActiveId] = useState<string>('');
  const activeCheckIns = useMemo(() => {
    const latestByKey = new Map<
      string,
      {
        id: string;
        name: string;
        email?: string;
        teamName?: string;
        teamNumber?: number | null;
        checkInDate?: Date | null;
      }
    >();
    students.forEach((r) => {
      const checkedIn = r.checkedIn === true;
      const checkedOut = r.checkedOut === true;
      if (!checkedIn || checkedOut) return;
      const id = (
        r.email ||
        r.studentName ||
        `${r.firstName ?? ''} ${r.lastName ?? ''}`
      )
        .trim()
        .toLowerCase();
      if (!id) return;
      const ci = r.checkInDate ?? null;
      const existing = latestByKey.get(id);
      if (
        !existing ||
        (ci && existing.checkInDate && ci > existing.checkInDate) ||
        (!existing.checkInDate && ci)
      ) {
        latestByKey.set(id, {
          id,
          name:
            r.studentName ||
            `${r.firstName ?? ''} ${r.lastName ?? ''}` ||
            r.email ||
            'Unknown',
          email: r.email,
          teamName: r.teamName,
          teamNumber: r.teamNumber,
          checkInDate: ci,
        });
      }
    });
    return Array.from(latestByKey.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [students]);

  const selectedActive = useMemo(
    () => activeCheckIns.find((a) => a.id === selectedActiveId),
    [activeCheckIns, selectedActiveId]
  );

  const renderDataPreview = () => {
    if (students.length === 0) {
      return null;
    }

    return (
      <div className="data-preview">
        <h2>Uploaded Records</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>School</th>
                <th>County</th>
                <th>Zip</th>
                <th>Grade</th>
                <th>Gender</th>
                <th>Age</th>
                <th>Adult?</th>
                <th>Team Name</th>
                <th>Team #</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const firstRows: StudentRecord[] = [];
                const seen = new Set<string>();
                students.forEach((s: StudentRecord) => {
                  const name = (
                    s.studentName || `${s.firstName ?? ''} ${s.lastName ?? ''}`
                  ).trim();
                  const hasRequired =
                    Boolean(name) &&
                    Boolean((s.schoolName || '').trim()) &&
                    s.age !== null &&
                    s.age !== undefined &&
                    s.isAdult !== null &&
                    s.isAdult !== undefined &&
                    Boolean((s.gender || '').trim());
                  if (!hasRequired) return;
                  const key = `${name.toLowerCase()}|${(s.age ?? '')
                    .toString()
                    .toLowerCase()}|${(s.teamName ?? '')
                    .toString()
                    .toLowerCase()}|${(s.teamNumber ?? '')
                    .toString()
                    .toLowerCase()}`;
                  if (seen.has(key)) return;
                  seen.add(key);
                  firstRows.push(s);
                });
                return firstRows.slice(0, 20).map((student, index) => {
                  const name = (
                    student.studentName ||
                    `${student.firstName ?? ''} ${student.lastName ?? ''}`
                  ).trim();
                  const rowKey = `${name.toLowerCase()}|${(student.age ?? '')
                    .toString()
                    .toLowerCase()}|${(student.teamName ?? '')
                    .toString()
                    .toLowerCase()}|${(student.teamNumber ?? '')
                    .toString()
                    .toLowerCase()}`;
                  return (
                    <tr key={`${student.studentName ?? 'student'}-${index}`}>
                      <td>
                        <button
                          onClick={() => {
                            setSelectedRecordKey(rowKey);
                            setSelectedRecordName(
                              name || student.studentName || ''
                            );
                          }}
                          style={{
                            cursor: 'pointer',
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            color: '#2563eb',
                            textDecoration: 'underline',
                          }}
                          title="Click to view all times"
                        >
                          {student.studentName ?? '—'}
                        </button>
                      </td>
                      <td>{student.schoolName ?? '—'}</td>
                      <td>{student.county ?? '—'}</td>
                      <td>{student.homeZipCode ?? '—'}</td>
                      <td>{student.grade ?? '—'}</td>
                      <td>{student.gender ?? '—'}</td>
                      <td>{student.age ?? '—'}</td>
                      <td>
                        {student.isAdult === null ||
                        student.isAdult === undefined
                          ? '—'
                          : student.isAdult
                          ? 'Yes'
                          : 'No'}
                      </td>
                      <td>{student.teamName ?? '—'}</td>
                      <td>{student.teamNumber ?? '—'}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
          {selectedRecordKey && (
            <div
              className="stat-card"
              style={{ marginTop: 12, textAlign: 'left' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h3 style={{ margin: 0 }}>
                  All Check-ins/outs for {selectedRecordName}
                </h3>
                <button
                  onClick={() => {
                    setSelectedRecordKey('');
                    setSelectedRecordName('');
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
              {(() => {
                type Entry = {
                  ci?: Date | null;
                  co?: Date | null;
                  et?: number | null;
                };
                const entries: Entry[] = [];
                students.forEach((s: StudentRecord) => {
                  const nm = (
                    s.studentName || `${s.firstName ?? ''} ${s.lastName ?? ''}`
                  ).trim();
                  const k = `${nm.toLowerCase()}|${(s.age ?? '')
                    .toString()
                    .toLowerCase()}|${(s.teamName ?? '')
                    .toString()
                    .toLowerCase()}|${(s.teamNumber ?? '')
                    .toString()
                    .toLowerCase()}`;
                  if (k !== selectedRecordKey) return;
                  entries.push({
                    ci:
                      s.checkInDate && isValidDate(s.checkInDate)
                        ? s.checkInDate
                        : null,
                    co:
                      s.checkOutDate && isValidDate(s.checkOutDate)
                        ? s.checkOutDate
                        : null,
                    et: s.elapsedTime ?? null,
                  });
                });
                entries.sort((a, b) => {
                  const ta = (a.ci ?? a.co ?? new Date(0)).getTime();
                  const tb = (b.ci ?? b.co ?? new Date(0)).getTime();
                  return ta - tb;
                });
                return (
                  <div className="table-wrapper" style={{ marginTop: 8 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Check-in Time</th>
                          <th>Check-out Time</th>
                          <th>Elapsed Time (min)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.length ? (
                          entries.map((e, i) => (
                            <tr key={`entry-${i}`}>
                              <td>{e.ci ? formatDateTime(e.ci) : '—'}</td>
                              <td>{e.co ? formatDateTime(e.co) : '—'}</td>
                              <td>{e.et ?? '—'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} style={{ color: '#666' }}>
                              No records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}
          {(() => {
            const seen = new Set<string>();
            let count = 0;
            students.forEach((s: StudentRecord) => {
              const name = (
                s.studentName || `${s.firstName ?? ''} ${s.lastName ?? ''}`
              ).trim();
              const hasRequired =
                Boolean(name) &&
                Boolean((s.schoolName || '').trim()) &&
                s.age !== null &&
                s.age !== undefined &&
                s.isAdult !== null &&
                s.isAdult !== undefined &&
                Boolean((s.gender || '').trim());
              if (!hasRequired) return;
              const key = `${name.toLowerCase()}|${(s.age ?? '')
                .toString()
                .toLowerCase()}|${(s.teamName ?? '')
                .toString()
                .toLowerCase()}|${(s.teamNumber ?? '')
                .toString()
                .toLowerCase()}`;
              if (seen.has(key)) return;
              seen.add(key);
              count++;
            });
            return count > 20 ? (
              <p className="table-note">Showing first 20 records.</p>
            ) : null;
          })()}
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <header className="app-header">
        <div>
          <h1>JSAC Student Insights Dashboard</h1>
          <p className="subtitle">
            Upload your OneTap data to explore demographics, engagement, and
            attendance trends.
          </p>
        </div>
      </header>

      <main className="app-content">
        <section className="upload-section">
          <div className="upload-card">
            <h2>Upload Excel</h2>
            <p className="helper-text">
              Accepted formats: <code>.xlsx</code>, <code>.xls</code>. Make sure
              headers match the required columns listed below.
            </p>
            <label className="file-upload">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
              />
              <span>Select Excel file</span>
            </label>
            {fileName && <p className="file-name">Loaded: {fileName}</p>}
            {error && <p className="error-text">{error}</p>}
            <div className="guidance">
              <h3>Required Columns</h3>
              <ul>
                <li>Student Name</li>
                <li>Gender</li>
                <li>Age</li>
                <li>Team Name</li>
                <li>Team Number</li>
                <li>School Name</li>
                <li>County</li>
                <li>Home Zip Code</li>
                <li>Grade</li>
                <li>Check-In Date</li>
                <li>Check-Out Date</li>
                <li>Elapsed Time (min)</li>
              </ul>
            </div>
          </div>
        </section>

        {students.length > 0 && (
          <>
            <section className="stats-cards">
              <div className="stat-card">
                <h3>Unique Students</h3>
                <p className="stat-value">
                  {uniqueStudentsCount.toLocaleString()}
                </p>
              </div>
              <div className="stat-card">
                <h3>Total Check-ins (Year)</h3>
                <p className="stat-value">{totalCheckIns.toLocaleString()}</p>
              </div>
            </section>

            {renderDataPreview()}

            <section className="charts-grid">
              <div className="chart-card">
                <h3>Currently Checked-in</h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 12,
                  }}
                >
                  <div>
                    <select
                      value={selectedActiveId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setSelectedActiveId(e.target.value)
                      }
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        border: '1px solid #ddd',
                        minWidth: 280,
                      }}
                    >
                      <option value="">
                        {activeCheckIns.length
                          ? 'Select a student'
                          : 'No active check-ins'}
                      </option>
                      {activeCheckIns.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedActive && (
                    <div className="stat-card" style={{ textAlign: 'left' }}>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 600,
                          marginBottom: 8,
                        }}
                      >
                        {selectedActive.name}
                      </div>
                      <div className="table-wrapper">
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: 8,
                          }}
                        >
                          <div>
                            <span style={{ color: '#666' }}>Team Name:</span>{' '}
                            {selectedActive.teamName ?? '—'}
                          </div>
                          <div>
                            <span style={{ color: '#666' }}>Team Number:</span>{' '}
                            {selectedActive.teamNumber ?? '—'}
                          </div>
                          <div>
                            <span style={{ color: '#666' }}>
                              Check-in Time:
                            </span>{' '}
                            {selectedActive.checkInDate
                              ? selectedActive.checkInDate.toLocaleString()
                              : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="charts-grid">
              {Object.keys(countyCounts).length > 0 && (
                <div className="chart-card">
                  <h3>Breakdown by County</h3>
                  <Pie
                    data={buildPieData(countyCounts, 'Students by County')}
                  />
                </div>
              )}

              {Object.keys(gradeCounts).length > 0 && (
                <div className="chart-card">
                  <h3>Breakdown by Grade</h3>
                  <Bar
                    data={buildBarData(gradeCounts, 'Students by Grade')}
                    options={defaultBarOptions}
                  />
                </div>
              )}

              {Object.keys(genderCounts).length > 0 && (
                <div className="chart-card">
                  <h3>Breakdown by Gender</h3>
                  <Pie
                    data={buildPieData(genderCounts, 'Students by Gender')}
                  />
                </div>
              )}

              {Object.keys(zipCounts).length > 0 && (
                <div className="chart-card">
                  <h3>Breakdown by Zip Code</h3>
                  <Bar
                    data={buildBarData(zipCounts, 'Students by Zip Code')}
                    options={defaultBarOptions}
                  />
                </div>
              )}

              {Object.keys(schoolCounts).length > 0 && (
                <div className="chart-card">
                  <h3>Breakdown by School</h3>
                  <Bar
                    data={buildBarData(schoolCounts, 'Students by School')}
                    options={defaultBarOptions}
                  />
                </div>
              )}

              {Object.keys(ageCounts).length > 0 && (
                <div className="chart-card">
                  <h3>Breakdown by Age</h3>
                  <Bar
                    data={buildBarData(ageCounts, 'Students by Age')}
                    options={defaultBarOptions}
                  />
                </div>
              )}

              <div className="chart-card chart-wide">
                <h3>Activity Over Time</h3>
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ color: '#666' }}>View:</span>
                    <button
                      onClick={() => setModeMonth('table')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border:
                          modeMonth === 'table'
                            ? '1px solid #4f46e5'
                            : '1px solid #ddd',
                        background: modeMonth === 'table' ? '#eef2ff' : 'white',
                        color: modeMonth === 'table' ? '#3730a3' : '#333',
                        cursor: 'pointer',
                      }}
                    >
                      Table
                    </button>
                    <button
                      onClick={() => setModeMonth('chart')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border:
                          modeMonth === 'chart'
                            ? '1px solid #4f46e5'
                            : '1px solid #ddd',
                        background: modeMonth === 'chart' ? '#eef2ff' : 'white',
                        color: modeMonth === 'chart' ? '#3730a3' : '#333',
                        cursor: 'pointer',
                      }}
                    >
                      Chart
                    </button>
                  </div>
                  {modeMonth === 'table' ? (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th style={{ textAlign: 'right' }}>Check-ins</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(monthCounts).map(([k, v]) => (
                            <tr key={k}>
                              <td>{k}</td>
                              <td style={{ textAlign: 'right' }}>{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Bar
                      data={{
                        labels: Object.keys(monthCounts),
                        datasets: [
                          {
                            label: 'Check-ins by Month',
                            data: Object.values(monthCounts),
                            backgroundColor: '#4f46e5',
                          },
                        ],
                      }}
                      options={defaultBarOptions}
                    />
                  )}
                </div>
                <div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ color: '#666' }}>View:</span>
                    <button
                      onClick={() => setModeWeek('table')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border:
                          modeWeek === 'table'
                            ? '1px solid #4f46e5'
                            : '1px solid #ddd',
                        background: modeWeek === 'table' ? '#eef2ff' : 'white',
                        color: modeWeek === 'table' ? '#3730a3' : '#333',
                        cursor: 'pointer',
                      }}
                    >
                      Table
                    </button>
                    <button
                      onClick={() => setModeWeek('chart')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border:
                          modeWeek === 'chart'
                            ? '1px solid #4f46e5'
                            : '1px solid #ddd',
                        background: modeWeek === 'chart' ? '#eef2ff' : 'white',
                        color: modeWeek === 'chart' ? '#3730a3' : '#333',
                        cursor: 'pointer',
                      }}
                    >
                      Chart
                    </button>
                  </div>
                  {modeWeek === 'table' ? (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Week</th>
                            <th style={{ textAlign: 'right' }}>Check-ins</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(weekCounts).map(([k, v]) => (
                            <tr key={k}>
                              <td>{k}</td>
                              <td style={{ textAlign: 'right' }}>{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Bar
                      data={{
                        labels: Object.keys(weekCounts),
                        datasets: [
                          {
                            label: 'Check-ins by Week',
                            data: Object.values(weekCounts),
                            backgroundColor: '#14b8a6',
                          },
                        ],
                      }}
                      options={defaultBarOptions}
                    />
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
