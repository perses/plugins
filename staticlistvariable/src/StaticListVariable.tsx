/* eslint-disable jsx-a11y/no-autofocus */
import { VariablePlugin, VariableOption, OptionsEditorProps } from '@perses-dev/plugin-system';
import { Autocomplete, Chip, IconButton, TextField, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import PlusCircleIcon from 'mdi-material-ui/PlusCircle';

type StaticListOption = string | VariableOption;

type StaticListVariableOptions = {
  values: StaticListOption[];
};

function StaticListVariableOptionEditor(props: OptionsEditorProps<StaticListVariableOptions>) {
  const {
    value: { values: variables = [] },
    onChange,
  } = props;

  const [editModeOption, setEditModeOption] = useState<string>('');

  const onChangeHandler = useCallback(
    (_: unknown, value: string[]): void => {
      const newVariable = value.pop();

      const valueExists = variables
        .map((v) => {
          return typeof v === 'string' ? v : (v as VariableOption)?.value || '';
        })
        .some((v) => v === newVariable);

      if (valueExists) return;

      onChange({
        values: [...variables, { value: String(newVariable), label: String(newVariable) }],
      });
    },
    [onChange, variables]
  );

  const onPasteHandler = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const v = e.clipboardData.getData('text/plain');
      if (v) {
        const items = v
          .split(',')
          .filter((i) => {
            const exists = variables
              .map((v) => {
                return (v as VariableOption)?.value || String(v);
              })
              .some((v) => v === i);
            return !exists;
          })
          .map((item) => ({ value: item.trim(), label: '' }));
        onChange({ values: [...variables, ...items] });
        e.preventDefault();
      }
    },
    [onChange, variables]
  );

  const tagDeleteHandler = useCallback(
    (option: string) => {
      const filteredVariables = variables.filter(
        (v) => !((v as string) === option || (v as VariableOption)?.value === option)
      );
      onChange({ values: [...filteredVariables] });
      setEditModeOption('');
    },
    [variables, onChange]
  );

  const renderTagsHandler = useCallback(
    (tagValue: string[]) => {
      const updateVariableWithLabel = (optionKey: string, label: string): Array<string | VariableOption> => {
        if (!optionKey || !label) return variables;
        /* Prevent duplicate label */
        const labelAlreadyExists = variables.filter((v) => typeof v !== 'string').some((v) => v?.label === label);
        if (labelAlreadyExists) return variables;

        return variables.map((v) => {
          if (typeof v === 'string') return v;
          const variableOption = v as VariableOption;
          if (variableOption!.value !== optionKey) return variableOption;
          const updatedVariableOption: VariableOption = {
            label,
            value: variableOption!.value,
          };
          return updatedVariableOption;
        });
      };

      return tagValue.map((_, index) => {
        const foundVariable = variables[index];
        if (!foundVariable) return null;

        const labelObject: { value: string; label: string } = { value: '', label: '' };

        if (typeof foundVariable === 'string') {
          /* value and label are identical */
          labelObject.value = foundVariable;
          labelObject.label = foundVariable;
        } else {
          labelObject.value = foundVariable.value;
          labelObject.label = foundVariable.label || foundVariable.value;
        }

        /* The value and key are the same thing, they can be used interchangeably  */
        const optionKey = (foundVariable as VariableOption)?.value || (foundVariable as string);

        return (
          <Chip
            key={optionKey}
            sx={{ margin: '4px' }}
            label={
              editModeOption !== optionKey ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Typography variant="body2">{labelObject.value}</Typography>
                  {labelObject?.value !== labelObject?.label && (
                    <Typography
                      variant="body2"
                      sx={{
                        backgroundColor: (theme) => theme.palette.grey[200],
                        color: (theme) => theme.palette.text.primary,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: 500,
                      }}
                    >
                      {labelObject.label}
                    </Typography>
                  )}
                  {/* Label can be added once and then no longer it will be editable */}
                  {typeof foundVariable !== 'string' && labelObject.value === labelObject.label && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditModeOption(optionKey);
                      }}
                      sx={{
                        color: (theme) => theme.palette.action.disabled,
                      }}
                    >
                      <PlusCircleIcon fontSize="small" />
                    </IconButton>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{optionKey}</span>
                  <TextField
                    defaultValue={labelObject.label}
                    onBlur={(e) => {
                      const {
                        target: { value: input },
                      } = e;
                      if (input) {
                        const updatedVariables = updateVariableWithLabel(optionKey, input);
                        onChange({ values: updatedVariables });
                      }
                      setEditModeOption('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const { value: input } = e.target as HTMLInputElement;
                        const updatedVariables = updateVariableWithLabel(optionKey, input);
                        onChange({ values: updatedVariables });
                        setEditModeOption('');
                      } else if (e.key === 'Escape') {
                        setEditModeOption('');
                      }
                    }}
                    size="small"
                    autoFocus
                    sx={{
                      width: '100%',
                      padding: 0,
                      margin: 0,
                      backgroundColor: (theme) => theme.palette.background.default,
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem',
                        padding: 0,
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        border: 'none',
                      },
                    }}
                    inputProps={{
                      style: {
                        padding: 0,
                      },
                    }}
                  />
                </div>
              )
            }
            onDelete={() => {
              tagDeleteHandler(optionKey);
            }}
          />
        );
      });
    },
    [variables, tagDeleteHandler, editModeOption, onChange]
  );

  return (
    <div>
      <Autocomplete
        onPaste={onPasteHandler}
        multiple
        value={variables.map((vr) => (typeof vr === 'string' ? vr : vr.label || vr.value))}
        onChange={onChangeHandler}
        options={[]}
        freeSolo
        clearOnBlur
        readOnly={props.isReadonly}
        renderTags={renderTagsHandler}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Values"
            placeholder="Values"
            helperText='Type new value then press "Enter" to add. Optionally define a label by clicking on the "+" button.'
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !params.inputProps.value) {
                e.stopPropagation();
              }
            }}
          />
        )}
      />
    </div>
  );
}

export const StaticListVariable: VariablePlugin<StaticListVariableOptions> = {
  getVariableOptions: async (spec) => {
    const values = spec.values?.map((v) => {
      if (typeof v === 'string') {
        return { label: v, value: v };
      }
      return v;
    });
    return {
      data: values,
    };
  },
  dependsOn: () => {
    return { variables: [] };
  },
  OptionsEditorComponent: StaticListVariableOptionEditor,
  createInitialOptions: () => ({ values: [] }),
};
