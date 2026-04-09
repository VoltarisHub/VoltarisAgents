export interface InputLink {
  id: string
  source: string
  url: string
  metadata?: Record<string, any>
}

export interface InputLinkResult {
  success: boolean
  link?: InputLink
  error?: string
}

export class InputLinkHandler {
  private links = new Map<string, InputLink>()

  register(link: InputLink): InputLinkResult {
    if (this.links.has(link.id)) {
      return { success: false, error: `Link with id "${link.id}" already exists.` }
    }
    this.links.set(link.id, link)
    return { success: true, link }
  }

  get(id: string): InputLinkResult {
    const link = this.links.get(id)
    if (!link) {
      return { success: false, error: `No link found for id "${id}".` }
    }
    return { success: true, link }
  }

  list(): InputLink[] {
    return Array.from(this.links.values())
  }

  unregister(id: string): boolean {
    return this.links.delete(id)
  }

  update(id: string, partial: Partial<InputLink>): InputLinkResult {
    const existing = this.links.get(id)
    if (!existing) {
      return { success: false, error: `Cannot update: no link found for id "${id}".` }
    }
    const updated: InputLink = { ...existing, ...partial }
    this.links.set(id, updated)
    return { success: true, link: updated }
  }

  findBySource(source: string): InputLink[] {
    return this.list().filter(l => l.source === source)
  }

  exportAsObject(): Record<string, InputLink> {
    return Object.fromEntries(this.links.entries())
  }

  clear(): void {
    this.links.clear()
  }
}
