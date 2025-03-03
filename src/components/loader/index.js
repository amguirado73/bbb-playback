import React, { useRef, useState } from 'react';
import {
  defineMessages,
  useIntl,
} from 'react-intl';
import {
  files,
  medias,
} from 'config';
import Data from './data';
import Dots from './dots';
import Error from 'components/error';
import Player from 'components/player';
import { build } from 'utils/builder';
import {
  ERROR,
  ID,
} from 'utils/constants';
import {
  buildFileURL,
  getFileName,
  getFileType,
  getLoadedData,
} from 'utils/data';
import {
  getLayout,
  getRecordId,
  getTime,
} from 'utils/params';
import logger from 'utils/logger';
import './index.scss';

const intlMessages = defineMessages({
  aria: {
    id: 'loader.wrapper.aria',
    description: 'Aria label for the loader wrapper',
  },
});

const initError = (recordId) => recordId ? null : ERROR.BAD_REQUEST;

const Loader = ({ match }) => {
  const intl = useIntl();
  const counter = useRef(0);
  const data = useRef({});
  const layout = useRef(getLayout());
  const recordId = useRef(getRecordId(match));
  const started = useRef(false);
  const time = useRef(getTime());

  const [, setBuilt] = useState(0);
  const [error, setError] = useState(initError(recordId.current));
  const [loaded, setLoaded] = useState(false);

  const fetchFile = (file) => {
    const url = buildFileURL(recordId.current, file);
    fetch(url).then(response => {
      if (response.ok) {
        logger.debug(ID.LOADER, file, response);
        const fileType = getFileType(file);
        switch (fileType) {
          case 'json':
            return response.json();
          case 'html':
            return response.text();
          case 'svg':
            return response.text();
          case 'xml':
            return response.text();
          default:
            setError(ERROR.BAD_REQUEST);
            return null;
        }
      } else {
        logger.warn('loader', file, response);
        return null;
      }
    }).then(value => {
      build(file, value).then(content => {
        if (content) logger.debug(ID.LOADER, 'builded', file);
        data.current[getFileName(file)] = content;
        update();
      }).catch(error => setError(ERROR.BAD_REQUEST));
    }).catch(error => setError(ERROR.NOT_FOUND));
  };

  const fetchMedia = () => {
    const fetches = medias.map(type => {
      const url = buildFileURL(recordId.current, `video/webcams.${type}`);
      return fetch(url, { method: 'HEAD' });
    });

    Promise.all(fetches).then(responses => {
      const media = [];
      responses.forEach(response => {
        const { ok, url } = response;
        if (ok) {
          logger.debug(ID.LOADER, 'media', response);
          media.push(medias.find(type => url.endsWith(type)));
        }
      });

      if (media.length > 0) {
        data.current.media = media;
        update();
      } else {
        // TODO: Handle audio medias
        setError(ERROR.NOT_FOUND);
      }
    });
  };

  const update = () => {
    counter.current = counter.current + 1;
    setBuilt(counter.current);
    // TODO: Better control
    if (counter.current > Object.keys(files.data).length) {
      if (!loaded) setTimeout(() => setLoaded(true), files.feedback.timeout);
    }
  };

  if (!started.current) {
    started.current = true;

    if (recordId.current) {
      for (const file in files.data) {
        fetchFile(files.data[file]);
      }

      fetchMedia();
    }
  }

  if (error) return <Error code={error} />;

  if (loaded) {
    return (
      <Player
        data={data.current}
        intl={intl}
        layout={layout.current}
        time={time.current}
      />
    );
  }

  return (
    <div
      aria-label={intl.formatMessage(intlMessages.aria)}
      className="loader-wrapper"
      id={ID.LOADER}
    >
      <div className="loader-top" />
      <div className="loader-middle">
        <Dots />
      </div>
      <div className="loader-bottom">
        {files.feedback.enabled ? <Data data={getLoadedData(data.current)} /> : null}
      </div>
    </div>
  );
};

export default Loader;
