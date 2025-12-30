// Copyright 2025 The Perses Authors
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

import { Dialog, LinkEditorForm } from '@perses-dev/components';
import { ReactElement, useEffect, useState } from 'react';

import { Button } from '@mui/material';
import { DataLink } from '../../models';

export interface Props {
  open: boolean;
  onSave: (dataLink: DataLink) => void;
  onClose: () => void;
  actionTitle: 'Add' | 'Edit';
  linkData: DataLink;
}

export const DataLinkEditor = (props: Props): ReactElement => {
  const {
    open,
    onClose,
    onSave,
    actionTitle,
    linkData: { url: _url, openNewTab: _openNewTab, title: _title },
  } = props;

  const [url, setUrl] = useState(_url);
  const [urlError, setUrlError] = useState<{ hasError?: boolean; helperText?: string }>({
    hasError: false,
    helperText: '',
  });
  const [openNewTab, setOpenNewTab] = useState(_openNewTab);
  const [title, setTitle] = useState(_title);

  useEffect(() => {
    /* If there is any error, as soon as the user starts typing and url is not empty, the error should disappear  */
    if (url) {
      setUrlError({
        hasError: false,
        helperText: '',
      });
    }
  }, [url]);

  return (
    <Dialog slotProps={{ transition: { unmountOnExit: true } }} open={open} fullWidth>
      <Dialog.Header>Data link</Dialog.Header>
      <Dialog.Content>
        <LinkEditorForm
          mode="modalEmbedded"
          url={{ label: 'Url', onChange: setUrl, value: url, placeholder: 'URL', error: urlError }}
          name={{ label: 'Name', onChange: setTitle, value: title ?? '', placeholder: 'Name' }}
          newTabOpen={{ label: 'Open in new tab', onChange: setOpenNewTab, value: openNewTab }}
        />
      </Dialog.Content>
      <Dialog.Actions>
        <Button
          variant="contained"
          type="submit"
          onClick={() => {
            if (!url) {
              setUrlError({ hasError: true, helperText: 'URL is required' });
              return;
            }
            onSave({ url, openNewTab, title });
            onClose();
          }}
        >
          {actionTitle}
        </Button>
        <Button variant="outlined" color="secondary" onClick={onClose}>
          Cancel
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
};
