Async Pool
==========

Object that manages a pool of resources, leting resource
users use and then return them so that no resource is used
by more than one user at the same time.

    Promise = require 'bluebird'
    Logger = require 'logger-facade-nodejs'
    log = Logger.getLogger('async-pool')

    class AsyncPool

Build a pool. Resources should be an array of resources.

      constructor: (resources)->
        @resources = resources
        @nresources = resources?.length ? 0
        @waiting = []
        @willClose = null

Get a resource when one comes available. Use with `Promise.using`

Throws a syncrhonous error if there is no pool. Will trigger
any waiting close to reject if used when waiting to close.

      use: ()->
        self = this
        @_checkCloseOnUse()
        return new Promise( (res)->
          resource = self.resources.pop()
          if resource?
            return res(resource)
          self.waiting.push(res)
        ).disposer (resource)->
          if self.isClosed()
            return
          waiter = self.waiting.pop()
          if waiter?
            waiter(resource)
          else
            self.resources.push resource
          if self.isClosing and resources.length = self.nresources
            self.closeImmediate()

Stop managing pool, and don't allow new uses. 

Will return synchronously, with "true" if already closed.

If you want to wait for close,  then call closeAndWait() -- but beware: if you
wait for closing in a callback that is using a resource, you will hang.

      close: ()->
        if @willClose?
          return false
        if !@resources?
          return true
        if @resources.length == @nresources
          @resources = null
          return true
        else
          @willClose = true

Close pool, and wait until closed. Be careful -- don't wait if pool is waiting
for you to return a resource!

      closeAndWait: ()->
        @close()
        if !@resources?
          return Promise.resolve(this)
        @willClose = Promise.defer()
        return @willClose.promise

Immediately stop managing pool. If there are waiters, throw an
exception.

      closeImmediately: ()->
        if !@resources?
          @willClose?.resolve?(this)
          @willClose = null
          return
        if @nresources > @resources.length
          @willClose?.reject?('Immediate close while resources still checked out.')
          @willClose = null
          throw new Error('AsyncPool closing while resources still checked out.')
        @resources = null
        @willClose?.resolve?(this)
        @willClose = null
        return this

Returns true if pool closing or is closed.

      isClosed: ()->
        return !@resources? or @willClose?

Check if closed when used.

      _checkCloseOnUse: ()->
        if @willClose?
          @willClose?.reject?(
            new Error('AsyncPool used while closing.'))
        if !@resources? or (@nresources) == 0 or @willClose?
          @willClose = null
          @resources = null
          throw new Error('AsyncPool is closed or without resources.')


    module.exports = AsyncPool