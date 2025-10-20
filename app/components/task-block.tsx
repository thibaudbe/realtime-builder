'use client'

import type { Block } from '../lib/store'
import { createBlock } from '../lib/store'

export interface BlockProps {
  block: Block
  onDelete?: () => void
}

export function TaskBlock({ block, onDelete }: BlockProps) {
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    block.title = value
  }

  const toggleCompleted = () => {
    if (block.type === 'todo') {
      block.completed = !block.completed
    }
  }

  const addChild = () => {
    const childTitle = prompt('Sub-task title?')
    if (childTitle) {
      block.children.push(createBlock(childTitle))
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete()
    }
  }

  return (
    <div style={{ marginLeft: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {block.type === 'todo' && (
          <input
            type="checkbox"
            checked={!!block.completed}
            onChange={toggleCompleted}
            style={{ marginRight: 4 }}
          />
        )}
        <input
          type="text"
          value={block.title}
          onChange={handleTitleChange}
          style={{ flex: 1, marginRight: 4 }}
        />
        <button onClick={addChild} title="Add a sub-task">
          +
        </button>
        <button onClick={handleDelete} title="Delete task">
          -
        </button>
      </div>
      {block.children.map((child, index) => {
        const removeChild = () => {
          block.children.splice(index, 1)
        }
        return <TaskBlock key={child.id} block={child} onDelete={removeChild} />
      })}
    </div>
  )
}
