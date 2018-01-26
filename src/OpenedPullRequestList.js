import React, { Component, PropTypes } from 'react';
import fetchBitbucket from './bitbucket';
import OpenedPullRequest from './OpenedPullRequest';
import { compareUpdatedOn } from './Sort';

class OpenedPrList extends Component {
  static propTypes = {
    repositories: PropTypes.array.isRequired,
    username: PropTypes.string.isRequired,
  }

  state = {
    pullRequestList: null,
  }

  constructor(props) {
    super(props);

    this.fetchPullRequests = this.fetchPullRequests.bind(this);
  }

  componentDidMount() {
    this.fetchPullRequests();
  }

  fetchPullRequests() {
    const repositories = this.props.repositories;
    if (!repositories) {
      return;
    }

    const promises = repositories.map(repo => {
      return fetchBitbucket(`repositories/mapado/${repo.name.toLowerCase()}/pullrequests?q=${encodeURIComponent(`author.username="${this.props.username}" AND state="OPEN"`)}`)
        .then(response => response.json())
        .then(prs => prs.values)
      ;
    });

    return Promise.all(promises)
      .then(pullrequestByRepo => {

        const out = pullrequestByRepo
          .filter(prByRepo => prByRepo.length > 0)
          .reduce(
            (out, prs) =>  out.concat(prs),
            []
          )
        ;

        Promise.all(out.map(pr => {
          const fetchActivity = fetchBitbucket(pr.links.activity.href)
            .then(response => response.json());
          const fetchSelf = fetchBitbucket(pr.links.self.href)
            .then(response => response.json());
          const fetchStatuses = fetchBitbucket(pr.links.statuses.href)
            .then(response => response.json());

          return Promise.all([fetchActivity, fetchSelf, fetchStatuses])
            .then(([activityList, self, statuses]) => {
              const approvalList = activityList.values.filter(activity => activity.approval);

              return {
                pr: self,
                approvalList,
                activityList: activityList.values,
                statuses,
              };
            })
          ;
        }))
          .then(out => {
            this.setState({
              pullRequestList: out,
            });
          })
        ;

      })
    ;
  }

  render() {
    const { pullRequestList } = this.state;

    if (!pullRequestList) {
      return null;
    }

    const sortedPullRequest = pullRequestList.sort(compareUpdatedOn);

    return (
      <div>
        <h2>Opened Pull Requests</h2>
        <table className="table">
          <thead>
            <tr>
              <td>Projet</td>
              <td>Title</td>
              <td>Reviewers</td>
              <td>Status</td>
              <td>Comments</td>
              <td>Last Comment</td>
              <td>My last comment</td>
            </tr>
          </thead>
          <tbody>
            {sortedPullRequest.map(({pr, approvalList, activityList, statuses}) =>
              <OpenedPullRequest
                username={this.props.username}
                key={`${pr.source.repository.full_name}-${pr.id}`}
                pr={pr}
                activityList={activityList}
                statuses={statuses}
              />
            )}
            {pullRequestList.length === 0 &&
              <tr>
                <td colSpan="100%">
                  No opened pull request
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    );
  }
}


export default OpenedPrList;
