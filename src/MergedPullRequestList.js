import React, { Component, PropTypes } from 'react';
import moment from 'moment';
import fetchBitbucket from './bitbucket';
import TimeFrom from './TimeFrom';
import { compareUpdatedOn } from './Sort';

function PullRequestList({ pullRequestList }) {
  const sortedPullRequest = pullRequestList.sort(compareUpdatedOn);

  return (
    <table className="table">
      <thead>
        <tr>
          <td>Projet</td>
          <td>Title</td>
          <td>Updated on</td>
        </tr>
      </thead>
      <tbody>
        {sortedPullRequest.map(pr =>
          <tr
            key={`${pr.source.repository.full_name}-${pr.id}`}
          >
            <td>{pr.source.repository.name}</td>
            <td>
              <a href={pr.links.html.href}>
                #{pr.id} {pr.title}
              </a>
            </td>
            <td>
              <TimeFrom when={pr.updated_on} />
            </td>
          </tr>
        )}
        {pullRequestList.length === 0 &&
          <tr>
            <td colSpan="100%">
              No merged pull request
            </td>
          </tr>
        }
      </tbody>
    </table>
  );
}

class MergedPrList extends Component {
  static propTypes = {
    repositories: PropTypes.array.isRequired,
    username: PropTypes.string.isRequired,
  }

  state = {
    last15daysPullRequests: null,
  }

  constructor(props) {
    super(props);

    this.fetchLast15DaysPullRequests = this.fetchLast15DaysPullRequests.bind(this);
  }

  componentDidMount() {
    this.fetchLast15DaysPullRequests();
  }

  fetchLast15DaysPullRequests() {
    const repositories = this.props.repositories;

    const promises = repositories.map(repo => {
      return fetchBitbucket(`repositories/mapado/${repo.name}/pullrequests?sort=-updated_on&q=${encodeURIComponent(`author.username="${this.props.username}" AND state="MERGED" AND updated_on >= ${moment().subtract(15, 'days').format('YYYY-MM-DD')}`)}`)
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

        return this.setState({
          last15daysPullRequests: out,
        });
      })
    ;
  }

  render() {
    if (!this.state.last15daysPullRequests) {
      return null;
    }

    return (
      <div>
        <h2>Merged in the last 15 days</h2>
        <PullRequestList
          pullRequestList={this.state.last15daysPullRequests}
        />
      </div>
    );
  }
}

export default MergedPrList;
