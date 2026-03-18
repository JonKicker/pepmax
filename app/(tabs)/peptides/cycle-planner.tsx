import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getPeptides } from '../../../src/services/peptideService';
import { addCycle } from '../../../src/services/cycleService';
import { generateCyclePlan, toLocalDateStr } from '../../../src/utils/cyclePlanner';
import {
  INCREMENT_FREQUENCIES,
  INCREMENT_FREQUENCY_LABELS,
  INJECTION_FREQUENCIES,
  INJECTION_FREQUENCY_LABELS,
  INJECTION_FREQ_DAY_COUNT,
  DAYS_OF_WEEK,
} from '../../../src/types/cycle';
import type {
  CycleWizardData,
  IncrementFrequency,
  InjectionFrequency,
  DayOfWeek,
} from '../../../src/types/cycle';
import type { Peptide } from '../../../src/types/peptide';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

const INITIAL_DATA: CycleWizardData = {
  compoundId: '',
  compoundName: '',
  unit: 'mg',
  startingDose: '',
  incrementAmount: '',
  incrementFrequency: 'weekly',
  maxDose: '',
  taperEnabled: false,
  taperWeeks: '',
  taperStepAmount: '',
  taperStepFrequency: 'weekly',
  injectionFrequency: '2xWeek',
  preferredDays: [],
  preferredTime: '08:00',
  startDate: toLocalDateStr(new Date()),
  durationWeeks: '',
  openEnded: false,
};

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({
  text,
  colors,
}: {
  text: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{text}</Text>
  );
}

// ─── Segment control ──────────────────────────────────────────────────────────

function SegmentRow<T extends string>({
  options,
  labels,
  selected,
  onSelect,
  colors,
  wrap,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  selected: T;
  onSelect: (v: T) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  wrap?: boolean;
}) {
  return (
    <View style={[styles.segmentWrap, wrap && styles.segmentWrapWrap]}>
      {options.map((opt) => {
        const active = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.segmentBtn,
              wrap && styles.segmentBtnWrap,
              {
                backgroundColor: active ? Colors.peptide : colors.surface,
                borderColor: active ? Colors.peptide : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(opt);
            }}
          >
            <Text
              style={[
                styles.segmentBtnText,
                { color: active ? 'white' : colors.textSecondary },
              ]}
            >
              {labels[opt]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Step 1: Select Compound ──────────────────────────────────────────────────

function Step1({
  data,
  onSelect,
  peptides,
  loading,
  colors,
  router,
}: {
  data: CycleWizardData;
  onSelect: (p: Peptide) => void;
  peptides: Peptide[];
  loading: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  router: ReturnType<typeof useRouter>;
}) {
  if (loading) {
    return (
      <View style={styles.stepCentered}>
        <ActivityIndicator color={Colors.peptide} />
      </View>
    );
  }

  if (peptides.length === 0) {
    return (
      <View style={styles.stepCentered}>
        <Ionicons name="eyedrop-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          No compounds in your library
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Add a peptide to your library before planning a cycle.
        </Text>
        <TouchableOpacity
          style={[styles.emptyBtn, { backgroundColor: Colors.peptide }]}
          onPress={() => router.push('/(tabs)/peptides/peptide-form')}
        >
          <Text style={styles.emptyBtnText}>Add Compound</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
        Which compound?
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Select the compound you want to plan a cycle for.
      </Text>

      {peptides.map((p) => {
        const selected = data.compoundId === p.id;
        return (
          <TouchableOpacity
            key={p.id}
            style={[
              styles.compoundCard,
              {
                backgroundColor: selected ? Colors.peptide + '12' : colors.surface,
                borderColor: selected ? Colors.peptide : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(p);
            }}
            activeOpacity={0.75}
          >
            <View style={styles.compoundCardLeft}>
              <View
                style={[
                  styles.compoundAccent,
                  { backgroundColor: selected ? Colors.peptide : colors.border },
                ]}
              />
              <View style={styles.compoundCardBody}>
                <Text style={[styles.compoundName, { color: colors.textPrimary }]}>
                  {p.name}
                </Text>
                <View style={styles.badgeRow}>
                  {p.category && (
                    <View style={[styles.badge, { backgroundColor: Colors.peptide + '1A' }]}>
                      <Text style={[styles.badgeText, { color: Colors.peptide }]}>
                        {p.category}
                      </Text>
                    </View>
                  )}
                  {p.halfLifeHours != null && (
                    <View style={[styles.badge, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
                      <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                        {p.halfLifeHours}h half-life
                      </Text>
                    </View>
                  )}
                  {p.route && (
                    <View style={[styles.badge, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
                      <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                        {p.route}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.badge, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                      {p.defaultDose} {p.unit}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            {selected && (
              <Ionicons name="checkmark-circle" size={22} color={Colors.peptide} />
            )}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={styles.addCompoundLink}
        onPress={() => router.push('/(tabs)/peptides/peptide-form')}
      >
        <Ionicons name="add-circle-outline" size={16} color={Colors.peptide} />
        <Text style={[styles.addCompoundLinkText, { color: Colors.peptide }]}>
          Add New Compound
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Step 2: Dose Schedule ────────────────────────────────────────────────────

function Step2({
  data,
  update,
  colors,
}: {
  data: CycleWizardData;
  update: <K extends keyof CycleWizardData>(key: K, value: CycleWizardData[K]) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const isManual = data.incrementFrequency === 'manual';

  return (
    <View>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Dose Schedule</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Configure the starting dose and how it increases over time.
      </Text>

      <SectionLabel text="STARTING DOSE" colors={colors} />
      <View style={styles.inputWithUnit}>
        <TextInput
          style={[
            styles.input,
            styles.inputFlex,
            { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
          ]}
          value={data.startingDose}
          onChangeText={(v) => update('startingDose', v)}
          keyboardType="decimal-pad"
          placeholder="e.g. 0.25"
          placeholderTextColor={colors.textSecondary}
        />
        <View style={[styles.unitPill, { backgroundColor: Colors.peptide + '1A' }]}>
          <Text style={[styles.unitPillText, { color: Colors.peptide }]}>{data.unit}</Text>
        </View>
      </View>

      <SectionLabel text="INCREMENT FREQUENCY" colors={colors} />
      <SegmentRow
        options={INCREMENT_FREQUENCIES}
        labels={INCREMENT_FREQUENCY_LABELS}
        selected={data.incrementFrequency}
        onSelect={(v) => update('incrementFrequency', v as IncrementFrequency)}
        colors={colors}
        wrap
      />

      {!isManual && (
        <>
          <SectionLabel text={`INCREASE BY (${data.unit})`} colors={colors} />
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
            ]}
            value={data.incrementAmount}
            onChangeText={(v) => update('incrementAmount', v)}
            keyboardType="decimal-pad"
            placeholder="e.g. 0.25"
            placeholderTextColor={colors.textSecondary}
          />

          <SectionLabel text={`MAXIMUM DOSE (${data.unit})`} colors={colors} />
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
            ]}
            value={data.maxDose}
            onChangeText={(v) => update('maxDose', v)}
            keyboardType="decimal-pad"
            placeholder="e.g. 2.4"
            placeholderTextColor={colors.textSecondary}
          />
        </>
      )}

      {isManual && (
        <View style={[styles.infoBox, { backgroundColor: Colors.peptide + '10', borderColor: Colors.peptide + '30' }]}>
          <Text style={[styles.infoBoxText, { color: Colors.peptide }]}>
            Manual mode: dose stays at the starting amount. You can adjust individual doses later.
          </Text>
        </View>
      )}

      {/* Taper section */}
      <View style={[styles.toggleRow, { borderColor: colors.border }]}>
        <View>
          <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
            Taper Down at End
          </Text>
          <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
            Gradually reduce dose before stopping
          </Text>
        </View>
        <Switch
          value={data.taperEnabled}
          onValueChange={(v) => update('taperEnabled', v)}
          trackColor={{ false: colors.border, true: Colors.peptide + '80' }}
          thumbColor={data.taperEnabled ? Colors.peptide : colors.textSecondary}
        />
      </View>

      {data.taperEnabled && (
        <View style={[styles.taperSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionLabel text="TAPER DURATION (WEEKS)" colors={colors} />
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border },
            ]}
            value={data.taperWeeks}
            onChangeText={(v) => update('taperWeeks', v)}
            keyboardType="number-pad"
            placeholder="e.g. 4"
            placeholderTextColor={colors.textSecondary}
          />

          <SectionLabel text={`DECREASE BY (${data.unit}) PER STEP`} colors={colors} />
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border },
            ]}
            value={data.taperStepAmount}
            onChangeText={(v) => update('taperStepAmount', v)}
            keyboardType="decimal-pad"
            placeholder="e.g. 0.25"
            placeholderTextColor={colors.textSecondary}
          />

          <SectionLabel text="TAPER STEP FREQUENCY" colors={colors} />
          <SegmentRow
            options={INCREMENT_FREQUENCIES.filter((f) => f !== 'manual') as Exclude<IncrementFrequency, 'manual'>[]}
            labels={INCREMENT_FREQUENCY_LABELS}
            selected={data.taperStepFrequency}
            onSelect={(v) => update('taperStepFrequency', v as Exclude<IncrementFrequency, 'manual'>)}
            colors={colors}
            wrap
          />
        </View>
      )}
    </View>
  );
}

// ─── Step 3: Timing ───────────────────────────────────────────────────────────

function Step3({
  data,
  update,
  toggleDay,
  colors,
}: {
  data: CycleWizardData;
  update: <K extends keyof CycleWizardData>(key: K, value: CycleWizardData[K]) => void;
  toggleDay: (day: DayOfWeek) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const requiredDays = INJECTION_FREQ_DAY_COUNT[data.injectionFrequency];
  const showDayPicker = requiredDays != null;

  const [timeHour, timeMinute] = data.preferredTime.split(':');

  function updateTime(part: 'h' | 'm', raw: string) {
    const clean = raw.replace(/\D/g, '').slice(0, 2);
    const h = part === 'h' ? clean : timeHour;
    const m = part === 'm' ? clean : timeMinute;
    update('preferredTime', `${h.padStart(2, '0')}:${m.padStart(2, '0')}`);
  }

  return (
    <View>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Timing</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Set your injection schedule and when the cycle starts.
      </Text>

      <SectionLabel text="INJECTION FREQUENCY" colors={colors} />
      <SegmentRow
        options={INJECTION_FREQUENCIES}
        labels={INJECTION_FREQUENCY_LABELS}
        selected={data.injectionFrequency}
        onSelect={(v) => {
          update('injectionFrequency', v as InjectionFrequency);
          update('preferredDays', []);
        }}
        colors={colors}
        wrap
      />

      {showDayPicker && (
        <>
          <SectionLabel
            text={`PREFERRED DAYS (select ${requiredDays})`}
            colors={colors}
          />
          <View style={styles.dayChipRow}>
            {DAYS_OF_WEEK.map((day) => {
              const active = data.preferredDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: active ? Colors.peptide : colors.surface,
                      borderColor: active ? Colors.peptide : colors.border,
                    },
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      { color: active ? 'white' : colors.textSecondary },
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <SectionLabel text="PREFERRED TIME" colors={colors} />
      <View style={styles.timeRow}>
        <TextInput
          style={[
            styles.timeInput,
            { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
          ]}
          value={timeHour}
          onChangeText={(v) => updateTime('h', v)}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="08"
          placeholderTextColor={colors.textSecondary}
        />
        <Text style={[styles.timeColon, { color: colors.textSecondary }]}>:</Text>
        <TextInput
          style={[
            styles.timeInput,
            { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
          ]}
          value={timeMinute}
          onChangeText={(v) => updateTime('m', v)}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="00"
          placeholderTextColor={colors.textSecondary}
        />
        <Text style={[styles.timeNote, { color: colors.textSecondary }]}>
          24-hour format (for reminders)
        </Text>
      </View>

      <SectionLabel text="CYCLE START DATE" colors={colors} />
      <Calendar
        current={data.startDate}
        markedDates={{ [data.startDate]: { selected: true, selectedColor: Colors.peptide } }}
        onDayPress={(day: { dateString: string }) => update('startDate', day.dateString)}
        theme={{
          backgroundColor: 'transparent',
          calendarBackground: 'transparent',
          dayTextColor: colors.textPrimary,
          todayTextColor: Colors.peptide,
          selectedDayTextColor: 'white',
          monthTextColor: colors.textPrimary,
          arrowColor: Colors.peptide,
          textDisabledColor: colors.textSecondary,
          dotColor: Colors.peptide,
        }}
        style={{ marginBottom: 4 }}
      />

      <SectionLabel text="CYCLE DURATION" colors={colors} />
      <View style={[styles.toggleRow, { borderColor: colors.border, marginBottom: 8 }]}>
        <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
          No end date (open-ended)
        </Text>
        <Switch
          value={data.openEnded}
          onValueChange={(v) => {
            update('openEnded', v);
            if (v) update('durationWeeks', '');
          }}
          trackColor={{ false: colors.border, true: Colors.peptide + '80' }}
          thumbColor={data.openEnded ? Colors.peptide : colors.textSecondary}
        />
      </View>

      {!data.openEnded && (
        <View style={styles.inputWithUnit}>
          <TextInput
            style={[
              styles.input,
              styles.inputFlex,
              { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
            ]}
            value={data.durationWeeks}
            onChangeText={(v) => update('durationWeeks', v)}
            keyboardType="number-pad"
            placeholder="e.g. 12"
            placeholderTextColor={colors.textSecondary}
          />
          <View style={[styles.unitPill, { backgroundColor: Colors.peptide + '1A' }]}>
            <Text style={[styles.unitPillText, { color: Colors.peptide }]}>weeks</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────

function Step4({
  data,
  planResult,
  planError,
  colors,
}: {
  data: CycleWizardData;
  planResult: ReturnType<typeof generateCyclePlan> | null;
  planError: string | null;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const markedDates = useMemo(() => {
    if (!planResult) return {};
    const result: Record<string, { dots: { key: string; color: string }[] }> = {};
    for (const pd of planResult.plannedDoses) {
      const dots: { key: string; color: string }[] = [
        { key: 'dose', color: Colors.peptide },
      ];
      if (pd.isIncreaseDay) dots.push({ key: 'increase', color: '#E67E22' });
      if (pd.isTaperDay) dots.push({ key: 'taper', color: '#00897B' });
      result[pd.date] = { dots };
    }
    return result;
  }, [planResult]);

  if (!planResult) {
    if (planError) {
      return (
        <View style={styles.stepCentered}>
          <Ionicons name="warning-outline" size={40} color={Colors.error} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Could not generate plan
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {planError}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.stepCentered}>
        <ActivityIndicator color={Colors.peptide} />
      </View>
    );
  }

  const previewDoses = planResult.plannedDoses.slice(0, 30);

  function formatDateRow(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <View>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Review Cycle</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {data.compoundName} — confirm before starting
      </Text>

      {/* Stats */}
      <View style={[styles.statsGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {planResult.totalInjections}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Injections
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {planResult.totalCompoundNeeded.toFixed(2)}
            <Text style={[styles.statUnit, { color: colors.textSecondary }]}>
              {' '}{data.unit}
            </Text>
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Total needed
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {planResult.peakDose}
            <Text style={[styles.statUnit, { color: colors.textSecondary }]}>
              {' '}{data.unit}
            </Text>
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Peak dose
          </Text>
        </View>
      </View>

      {/* End date */}
      <View style={[styles.endDateRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.endDateText, { color: colors.textSecondary }]}>
          {planResult.isOpenEnded ? 'Open-ended (showing first 52 weeks)' : `Ends ${planResult.cycleEndDate}`}
        </Text>
      </View>

      {/* Calendar with dose markers — navigate to cycle start month */}
      <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Calendar
          current={planResult.plannedDoses[0]?.date ?? data.startDate}
          markingType="multi-dot"
          markedDates={markedDates}
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            dayTextColor: colors.textPrimary,
            todayTextColor: Colors.peptide,
            monthTextColor: colors.textPrimary,
            arrowColor: Colors.peptide,
            textDisabledColor: colors.textSecondary,
          }}
        />
        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.peptide }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Dose day</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#E67E22' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Dose increase</Text>
          </View>
          {data.taperEnabled && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#00897B' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Taper day</Text>
            </View>
          )}
        </View>
      </View>

      {/* First 30 doses list */}
      <Text style={[styles.doseListTitle, { color: colors.textSecondary }]}>
        PLANNED DOSES{planResult.totalInjections > 30 ? ` (first 30 of ${planResult.totalInjections})` : ''}
      </Text>

      {previewDoses.map((pd) => (
        <View
          key={pd.date}
          style={[
            styles.doseRow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderLeftColor: pd.isIncreaseDay ? '#E67E22' : pd.isTaperDay ? '#00897B' : Colors.peptide,
            },
          ]}
        >
          <View style={styles.doseRowLeft}>
            <Text style={[styles.doseRowDate, { color: colors.textPrimary }]}>
              {formatDateRow(pd.date)}
            </Text>
            {pd.isIncreaseDay && (
              <View style={[styles.dosePill, { backgroundColor: '#E67E22' + '20' }]}>
                <Text style={[styles.dosePillText, { color: '#E67E22' }]}>↑ Increase</Text>
              </View>
            )}
            {pd.isTaperDay && (
              <View style={[styles.dosePill, { backgroundColor: '#00897B' + '20' }]}>
                <Text style={[styles.dosePillText, { color: '#00897B' }]}>↓ Taper</Text>
              </View>
            )}
          </View>
          <Text style={[styles.doseRowAmount, { color: Colors.peptide }]}>
            {pd.amount} {data.unit}
          </Text>
        </View>
      ))}

      {planResult.totalInjections > 30 && (
        <Text style={[styles.doseListMore, { color: colors.textSecondary }]}>
          + {planResult.totalInjections - 30} more doses
        </Text>
      )}
    </View>
  );
}

// ─── Main wizard screen ───────────────────────────────────────────────────────

export default function CyclePlannerScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [peptides, setPeptides] = useState<Peptide[]>([]);
  const [loadingPeptides, setLoadingPeptides] = useState(true);
  const [data, setData] = useState<CycleWizardData>({ ...INITIAL_DATA });

  function update<K extends keyof CycleWizardData>(key: K, value: CycleWizardData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function toggleDay(day: DayOfWeek) {
    setData((prev) => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter((d) => d !== day)
        : [...prev.preferredDays, day],
    }));
    setError(null);
  }

  useEffect(() => {
    getPeptides().then((result) => {
      setPeptides(result.data ?? []);
      setLoadingPeptides(false);
    });
  }, []);

  function validateStep(): string | null {
    switch (step) {
      case 1:
        if (!data.compoundId) return 'Select a compound to continue.';
        break;

      case 2: {
        const startDose = parseFloat(data.startingDose);
        if (!data.startingDose || isNaN(startDose) || startDose <= 0) {
          return 'Enter a valid starting dose greater than 0.';
        }
        if (data.incrementFrequency !== 'manual') {
          const increment = parseFloat(data.incrementAmount);
          if (!data.incrementAmount || isNaN(increment) || increment < 0) {
            return 'Enter a valid increment amount.';
          }
          const maxDoseNum = parseFloat(data.maxDose);
          if (!data.maxDose || isNaN(maxDoseNum) || maxDoseNum < startDose) {
            return `Max dose must be ≥ starting dose (${data.startingDose} ${data.unit}).`;
          }
        }
        if (data.taperEnabled) {
          const tw = parseFloat(data.taperWeeks);
          if (!data.taperWeeks || isNaN(tw) || tw <= 0) {
            return 'Enter the number of taper-down weeks.';
          }
          const tsa = parseFloat(data.taperStepAmount);
          if (!data.taperStepAmount || isNaN(tsa) || tsa <= 0) {
            return 'Enter a valid taper step amount.';
          }
        }
        break;
      }

      case 3: {
        if (!data.startDate) return 'Select a cycle start date.';
        const requiredDays = INJECTION_FREQ_DAY_COUNT[data.injectionFrequency];
        if (requiredDays != null && data.preferredDays.length !== requiredDays) {
          return `Select exactly ${requiredDays} preferred day${requiredDays > 1 ? 's' : ''} for ${INJECTION_FREQUENCY_LABELS[data.injectionFrequency]}.`;
        }
        if (data.taperEnabled && data.openEnded) {
          return 'Set a cycle duration to use taper-down (open-ended cycles cannot taper).';
        }
        if (!data.openEnded) {
          const dw = parseFloat(data.durationWeeks);
          if (!data.durationWeeks || isNaN(dw) || dw <= 0) {
            return 'Enter a valid cycle duration in weeks, or enable "No end date".';
          }
          if (data.taperEnabled) {
            const tw = parseFloat(data.taperWeeks);
            if (tw >= dw) {
              return 'Taper weeks must be less than total cycle duration.';
            }
          }
        }
        break;
      }
    }
    return null;
  }

  // Compute plan in step 4
  const { planResult, planError } = useMemo(() => {
    if (step !== 4 || !data.compoundId || !data.startingDose) {
      return { planResult: null, planError: null };
    }
    const startDose = parseFloat(data.startingDose);
    if (isNaN(startDose) || startDose <= 0) {
      return { planResult: null, planError: null };
    }
    const isManual = data.incrementFrequency === 'manual';
    const incrementAmt = isManual ? 0 : parseFloat(data.incrementAmount) || 0;
    const maxDose = isManual ? startDose : parseFloat(data.maxDose) || startDose;
    const durationWeeks = data.openEnded ? null : parseFloat(data.durationWeeks) || null;
    const taperEnabled = data.taperEnabled && !data.openEnded && !!data.durationWeeks;
    const taperConfig = taperEnabled
      ? {
          taperWeeks: parseFloat(data.taperWeeks) || 0,
          taperStepAmount: parseFloat(data.taperStepAmount) || 0,
          taperStepFrequency: data.taperStepFrequency,
        }
      : null;

    try {
      const result = generateCyclePlan({
        startingDose: startDose,
        incrementAmount: incrementAmt,
        incrementFrequency: data.incrementFrequency,
        maxDose,
        injectionFrequency: data.injectionFrequency,
        preferredDays: data.preferredDays,
        startDate: data.startDate,
        durationWeeks,
        taperEnabled,
        taperConfig,
      });
      return { planResult: result, planError: null };
    } catch (e) {
      return {
        planResult: null,
        planError: 'Could not generate dose schedule. Go back and check your settings.',
      };
    }
  }, [step, data]);

  async function handleSave() {
    if (!planResult || planResult.totalInjections === 0) {
      setError('No doses were generated for this configuration. Go back and check your settings.');
      return;
    }
    setSaving(true);

    const isManual = data.incrementFrequency === 'manual';
    const startDose = parseFloat(data.startingDose);
    const incrementAmt = isManual ? 0 : parseFloat(data.incrementAmount) || 0;
    const maxDose = isManual ? startDose : parseFloat(data.maxDose) || startDose;
    const durationWeeks = data.openEnded ? null : parseFloat(data.durationWeeks) || null;
    const taperEnabled = data.taperEnabled && !data.openEnded && !!data.durationWeeks;

    const result = await addCycle({
      compoundId: data.compoundId,
      compoundName: data.compoundName,
      unit: data.unit,
      startingDose: startDose,
      incrementAmount: incrementAmt,
      incrementFrequency: data.incrementFrequency,
      maxDose,
      injectionFrequency: data.injectionFrequency,
      preferredDays: data.preferredDays,
      preferredTime: data.preferredTime,
      startDate: data.startDate,
      durationWeeks,
      taperEnabled,
      taperConfig: taperEnabled
        ? {
            taperWeeks: parseFloat(data.taperWeeks) || 0,
            taperStepAmount: parseFloat(data.taperStepAmount) || 0,
            taperStepFrequency: data.taperStepFrequency,
          }
        : null,
      plannedDoses: planResult.plannedDoses,
      status: 'active',
    });

    setSaving(false);

    if (result.error) {
      setError('Failed to save cycle. Please try again.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  function handleNext() {
    const err = validateStep();
    if (err) {
      setError(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (step < TOTAL_STEPS) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep((s) => s + 1);
    } else {
      handleSave();
    }
  }

  function handleBack() {
    if (step > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setError(null);
      setStep((s) => s - 1);
    }
  }

  const isLastStep = step === TOTAL_STEPS;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: Colors.peptide,
              width: `${(step / TOTAL_STEPS) * 100}%` as `${number}%`,
            },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <Step1
              data={data}
              onSelect={(p) => {
                update('compoundId', p.id);
                update('compoundName', p.name);
                update('unit', p.unit);
                update('startingDose', String(p.defaultDose));
              }}
              peptides={peptides}
              loading={loadingPeptides}
              colors={colors}
              router={router}
            />
          )}

          {step === 2 && <Step2 data={data} update={update} colors={colors} />}

          {step === 3 && (
            <Step3 data={data} update={update} toggleDay={toggleDay} colors={colors} />
          )}

          {step === 4 && (
            <Step4 data={data} planResult={planResult} planError={planError} colors={colors} />
          )}

          {/* Error */}
          {error && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: Colors.error + '18', borderColor: Colors.error + '40' },
              ]}
            >
              <Text style={[styles.errorText, { color: Colors.error }]}>{error}</Text>
            </View>
          )}

          {/* Navigation */}
          <View style={styles.navRow}>
            {step > 1 ? (
              <TouchableOpacity
                style={[styles.backBtn, { borderColor: colors.border }]}
                onPress={handleBack}
              >
                <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
                <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>
                  Back
                </Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}

            <TouchableOpacity
              style={[
                styles.nextBtn,
                { backgroundColor: Colors.peptide },
                saving && { opacity: 0.7 },
              ]}
              onPress={handleNext}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>
                    {isLastStep ? 'Looks Good — Start Cycle' : 'Next'}
                  </Text>
                  {!isLastStep && (
                    <Ionicons name="chevron-forward" size={18} color="white" />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>
            Step {step} of {TOTAL_STEPS}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Progress
  progressTrack: { height: 3, width: '100%' },
  progressFill: { height: 3 },

  scroll: { padding: 20, paddingBottom: 40 },

  // Step header
  stepTitle: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  stepSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 20 },

  // Section label
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },

  // Input
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    marginBottom: 4,
  },
  inputFlex: { flex: 1 },
  inputWithUnit: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unitPill: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 10,
  },
  unitPillText: { fontSize: 14, fontWeight: '700' },

  // Segment control
  segmentWrap: { flexDirection: 'row', gap: 8 },
  segmentWrapWrap: { flexWrap: 'wrap' },
  segmentBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  segmentBtnWrap: { marginBottom: 4 },
  segmentBtnText: { fontSize: 13, fontWeight: '600' },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 20,
  },
  toggleLabel: { fontSize: 15, fontWeight: '500' },
  toggleSub: { fontSize: 12, marginTop: 2 },

  // Taper section (nested card)
  taperSection: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
  },

  // Info box
  infoBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  infoBoxText: { fontSize: 13, lineHeight: 18 },

  // Compound card (step 1)
  compoundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    paddingRight: 14,
  },
  compoundCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  compoundAccent: { width: 4, alignSelf: 'stretch' },
  compoundCardBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  compoundName: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  addCompoundLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    alignSelf: 'center',
  },
  addCompoundLinkText: { fontSize: 14, fontWeight: '600' },

  // Empty state
  stepCentered: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  // Day chips (step 3)
  dayChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    width: 48,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: { fontSize: 13, fontWeight: '600' },

  // Time (step 3)
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 18,
    fontWeight: '600',
    width: 64,
    textAlign: 'center',
  },
  timeColon: { fontSize: 22, fontWeight: '700' },
  timeNote: { fontSize: 12, flex: 1 },

  // Review step (step 4)
  statsGrid: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statUnit: { fontSize: 12, fontWeight: '400' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, marginVertical: 10 },
  endDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  endDateText: { fontSize: 13 },
  calendarCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    padding: 4,
  },
  legendRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 12, paddingBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },
  doseListTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  doseRowLeft: { flex: 1, gap: 4 },
  doseRowDate: { fontSize: 14, fontWeight: '500' },
  dosePill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  dosePillText: { fontSize: 11, fontWeight: '700' },
  doseRowAmount: { fontSize: 15, fontWeight: '700' },
  doseListMore: { fontSize: 13, textAlign: 'center', paddingVertical: 10 },

  // Error
  errorBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  errorText: { fontSize: 14, lineHeight: 20 },

  // Navigation
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  backBtnText: { fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 12,
    paddingVertical: 15,
  },
  nextBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  stepIndicator: { fontSize: 12, textAlign: 'center', marginTop: 12 },
});
