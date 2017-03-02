import React from 'react';
import TimeFrom from './TimeFrom';

function RepositoryList({ repositoryList }) {
  if (!repositoryList) {
    return null;
  }

  return (
    <div className="grid-row-from-sm RepositoryList">
      {repositoryList.values.map(repo =>
        <div key={repo.uuid} className="grid-col-6-from-sm grid-col-3-from-md">
          <div className="mpd-block Repository">
            <a href={repo.links.html.href} className="mpd-block-content Repository-Link">
              <div>{repo.name}</div>
              <TimeFrom when={repo.updated_on} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default  RepositoryList;
