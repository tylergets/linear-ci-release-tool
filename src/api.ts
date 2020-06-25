
import {GraphQLClient} from 'graphql-request'
import gql from 'graphql-tag'
import {print} from 'graphql/language/printer'

const baseUrl = 'https://api.linear.app/graphql'

export default class LinearApi {
  static create(token: string): LinearApi {
    const client = new GraphQLClient(baseUrl, {
      headers: {
        authorization: token,
      },
    })

    return new LinearApi(client)
  }

  client: GraphQLClient;

  constructor(client: GraphQLClient) {
    this.client = client
  }

  async request(query: any, vars?: any) {
    const data = await this.client.request(print(query), vars)
    return data
  }

  async getAllIssues() {
    const issues: any = []
    let hasNextPage = true
    let cursor = null
    while (hasNextPage) {
      // eslint-disable-next-line no-await-in-loop
      const data: any = await this.request(gql`
        query ($after: String){
          issues(first: 50, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              title
              state {
                  id
              }
              labels {
                nodes {
                  id
                  name
                }
              }
            }
          }
        }
      `, {
        after: cursor,
      })

      issues.push(...data.issues.nodes)

      cursor = data.issues.pageInfo.endCursor
      hasNextPage = data.issues.pageInfo.hasNextPage
    }

    return issues;
  }

  async getWorkflowStateByName(name: string) {
    const {workflowStates} = await this.request(gql`
        query {
            workflowStates {
              nodes {
                id
                name
                type
              }
            }
        }
    `)

    const targetNode = workflowStates.nodes.find((node: any) => {
      return node.name === name
    })

    return targetNode
  }

  async moveIssue(issueId: string, stateId: string) {
    return this.request(gql`mutation($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: {stateId: $stateId}) {
        success
      }
    }`, {
      id: issueId,
      stateId,
    })
  }
}
