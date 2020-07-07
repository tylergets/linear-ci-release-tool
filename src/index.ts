
import 'node-fetch'

import {Command, flags} from '@oclif/command'
import LinearApi from './api'

class LinearCiReleaseTool extends Command {
  static description = 'move issues from linear'

  static flags = {
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
    token: flags.string({char: 't', description: 'token'}),
    repo: flags.string({char: 'r', description: 'github repo'}),
    labels: flags.string({char: 'l', description: 'labels', multiple: true}),
    dry: flags.boolean({char: 'd', description: 'dry run'}),
  }

  static args = [{name: 'start'}, {name: 'end'}]

  async run() {
    const {args, flags} = this.parse(LinearCiReleaseTool)
    const {start, end} = args
    console.log(`Moving from ${start} to ${end}`)

    if (!flags.token) {
      console.log('Must supply token')
      return
    }

    const api = LinearApi.create(flags.token)

    const startWorkflow = await api.getWorkflowStateByName(start)
    const endWorkflow = await api.getWorkflowStateByName(end)

    const issues = await api.getAllIssues()

    const stagedIssues = issues.filter((i: any) => i.state.id === startWorkflow.id)

    for (const issue of stagedIssues) {
      if (flags.labels && flags.labels.length > 0) {
        const matchesLabel = issue.labels.nodes.map((l: any) => l.name).some((label: any) => {
          return flags.labels.includes(label)
        })
        if (!matchesLabel) {
          continue
        }
      }

      if (flags.repo) {
        if (issue.integrationResources.nodes.length === 0) {
          continue
        }
        const isInRepo = issue.integrationResources.nodes.some(({data}: any) => {
          return data.githubPullRequest.repoName === flags.repo
        })
        if (!isInRepo) {
          continue
        }
      }

      console.log(`${flags.dry ? 'DRY ' : ''}Moving ${issue.title}: [${issue.labels.nodes.map((l: any) => l.name).join(', ')}]`)

      if (!flags.dry) {
        // eslint-disable-next-line no-await-in-loop
        await api.moveIssue(issue.id, endWorkflow.id)
      }
    }
  }
}

export = LinearCiReleaseTool
