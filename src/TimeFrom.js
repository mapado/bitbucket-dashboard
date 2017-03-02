import React from 'react';
import moment from 'moment';

function TimeFrom({ when }) {
  return (when &&
    <div title={moment(when).format()}>
      {moment(when).fromNow()}
    </div>
  );
}

export default TimeFrom;
