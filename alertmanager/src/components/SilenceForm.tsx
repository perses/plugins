// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import AddIcon from 'mdi-material-ui/Plus';
import { ReactElement, useState } from 'react';
import { PostableSilence } from '../model/api-types';
import { MatcherEditor, MatcherValue } from './MatcherEditor';

export interface SilenceFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (silence: PostableSilence) => void;
  initialSilence?: Partial<PostableSilence>;
}

const DEFAULT_MATCHER: MatcherValue = {
  name: '',
  value: '',
  isEqual: true,
  isRegex: false,
};

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getDefaultEndTime(): string {
  const end = new Date();
  end.setMinutes(end.getMinutes() + 30);
  return toLocalDatetimeString(end);
}

function getNowLocalISO(): string {
  return toLocalDatetimeString(new Date());
}

/**
 * Form dialog for creating or editing silences.
 */
export function SilenceForm({ open, onClose, onSubmit, initialSilence }: SilenceFormProps): ReactElement {
  const [matchers, setMatchers] = useState<MatcherValue[]>(
    initialSilence?.matchers?.length
      ? initialSilence.matchers.map((m) => ({
          name: m.name,
          value: m.value,
          isEqual: m.isEqual,
          isRegex: m.isRegex,
        }))
      : [{ ...DEFAULT_MATCHER }]
  );
  const [startsAt, setStartsAt] = useState(initialSilence?.startsAt?.slice(0, 16) ?? getNowLocalISO());
  const [endsAt, setEndsAt] = useState(initialSilence?.endsAt?.slice(0, 16) ?? getDefaultEndTime());
  const [createdBy, setCreatedBy] = useState(initialSilence?.createdBy ?? '');
  const [comment, setComment] = useState(initialSilence?.comment ?? '');

  const handleAddMatcher = (): void => {
    setMatchers([...matchers, { ...DEFAULT_MATCHER }]);
  };

  const handleMatcherChange = (index: number, updated: MatcherValue): void => {
    const next = [...matchers];
    next[index] = updated;
    setMatchers(next);
  };

  const handleRemoveMatcher = (index: number): void => {
    setMatchers(matchers.filter((_, i) => i !== index));
  };

  const handleSubmit = (): void => {
    const startsAtDate = new Date(startsAt);
    const endsAtDate = new Date(endsAt);
    if (isNaN(startsAtDate.getTime()) || isNaN(endsAtDate.getTime())) return;

    const silence: PostableSilence = {
      id: initialSilence?.id,
      matchers: matchers.map((m) => ({
        name: m.name,
        value: m.value,
        isEqual: m.isEqual,
        isRegex: m.isRegex,
      })),
      startsAt: startsAtDate.toISOString(),
      endsAt: endsAtDate.toISOString(),
      createdBy,
      comment,
    };
    onSubmit(silence);
  };

  const startsAtDate = new Date(startsAt);
  const endsAtDate = new Date(endsAt);
  const isValidDates =
    !isNaN(startsAtDate.getTime()) && !isNaN(endsAtDate.getTime()) && endsAtDate.getTime() > startsAtDate.getTime();
  const isValid =
    matchers.length > 0 && matchers.every((m) => m.name.length > 0) && createdBy.length > 0 && isValidDates;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{initialSilence?.id ? 'Edit Silence' : 'Create Silence'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="subtitle2">Matchers</Typography>
          {matchers.map((matcher, index) => (
            <MatcherEditor
              key={index}
              matcher={matcher}
              onChange={(updated) => handleMatcherChange(index, updated)}
              onRemove={() => handleRemoveMatcher(index)}
            />
          ))}
          <Button startIcon={<AddIcon />} onClick={handleAddMatcher} variant="outlined" size="small">
            Add Matcher
          </Button>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Start"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="End"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
          </Stack>

          <TextField
            label="Creator"
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
            size="small"
            required
          />
          <TextField
            label="Comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            size="small"
            multiline
            rows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!isValid}>
          {initialSilence?.id ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
