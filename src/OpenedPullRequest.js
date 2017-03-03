import React from 'react';
import cn from 'classnames';
import TimeFrom from './TimeFrom';
import './OpenedPullRequest.css';

function reduceStatuses(out, status) {
  const state = status.state;

  if (!out) {
    return state;
  }

  if (out === 'INPROGRESS' || state === 'INPROGRESS') {
    return 'INPROGRESS';
  }

  if (out !== 'SUCCESSFUL') {
    return out;
  }

  if (state !== 'SUCCESSFUL') {
    return state;
  }

  return 'SUCCESSFUL';
}

function Avatar({ user }) {
  return (
    <img
      className="Participant-image"
      src={user.links.avatar.href}
      alt={user.display_name}
    />
  );
}

function Comment({ comment }) {
  if (!comment) {
    return null;
  }

  return (<div className="media">
    <div className="media__object">
      <Avatar user={comment.comment.user} />
    </div>
    <div className="media__body">
      <TimeFrom when={comment.comment.created_on} />
      <div>
        {comment.comment.content.raw.substr(0, 20)}...
      </div>
    </div>
  </div>);
}

function Participant({ participant }) {
  return (
    <div key={participant.user.uuid} className={cn('Participant', participant.approved && 'Participant--approved')}>
      <Avatar user={participant.user} />
      {participant.approved &&
        <div className="Participant-badge"><span>✔️️</span></div>
      }
    </div>
  );
}

function TrStatus({ children, status, ...props }) {
  return (
    <tr {...props} className={`PullRequest-status--${status && status.toLowerCase()}`}>
      {children}
    </tr>
  );
}

function OpenedPullRequest({ pr, activityList, statuses, username }) {
  const key = `${pr.source.repository.full_name}-${pr.id}`;

  const lastComment = activityList && activityList.find(activity => !!activity.comment);
  const myLastComment = activityList && activityList.find(activity => activity.comment && activity.comment.user.username === username);

  const mainStatus = statuses && statuses.values.reduce(reduceStatuses, null);
  const mainStatusClassname = mainStatus === 'SUCCESSFUL' ?
    'mpd-block-bg-green' :
    mainStatus === 'FAILED' ? 'mpd-block-bg-red' :
    mainStatus === 'INPROGRESS' ? 'mpd-block-bg-blue' :
    null
    ;

  return (
    <TrStatus key={key} status={mainStatus}>
      <td>{pr.source.repository.name}</td>
      <td>
        <a href={pr.links.html.href}>
          #{pr.id} {pr.title}
        </a>
      </td>
      <td>
        <div className="ParticipantList">
          {pr.participants && pr.participants.map(participant =>
            <Participant key={participant.user.uuid} participant={participant} />
          )}
        </div>
      </td>
      <td className={mainStatusClassname}>{mainStatus}</td>
      <td>{pr.comment_count} comments</td>
      <td>
        <Comment comment={lastComment} />
      </td>
      <td>
        <Comment comment={myLastComment} />
      </td>
    </TrStatus>
  );
}

export default OpenedPullRequest;
