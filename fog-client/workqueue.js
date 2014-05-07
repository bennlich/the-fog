// edited to pass the snapshot, in addition to the data, to the processingCallback
// edited to have an off() function

/**
 * This class manages a list of Firebase elements and dispatches items in it to 
 * be processed. It is designed to only process one item at a time. 
 *
 * It uses transactions to grab queue elements, so it's safe to run multiple
 * workers at the same time processing the same queue.
 *
 * @param queueRef A Firebase reference to the list of work items
 * @param processingCallback The callback to be called for each work item
 */
function WorkQueue(queueRef, processingCallback) {
	this.processingCallback = processingCallback;
	this.busy = false;
	this.queueRef = queueRef;
	queueRef.startAt().limit(1).on("child_added", function(snap) {
		this.currentItem = snap.ref();
		this.tryToProcess();
	}, this);
}

WorkQueue.prototype.readyToProcess = function() {
	this.busy = false;
	this.tryToProcess();
}

WorkQueue.prototype.tryToProcess = function() {
	if(!this.busy && this.currentItem) {
		this.busy = true;
		var dataToProcess = null;
		var self = this;
		var toProcess = this.currentItem;
		this.currentItem = null;
		toProcess.transaction(function(theItem) {
			dataToProcess = theItem;
			if(theItem) {
				return null;
			} else {
				return;
			}
		}, function(error, committed, snapshot, dummy) {
			 if (error) throw error;
			 if(committed) {
				 console.log("Claimed a job.");
				 self.processingCallback(dataToProcess, snapshot, function() {
					 self.readyToProcess();
				 });
			 } else {
				 console.log("Another worker beat me to the job.");
				 self.readyToProcess();
			 }
		});
	}
}

WorkQueue.prototype.off = function() {
	this.queueRef.off();
}

if (typeof(module) !== 'undefined') module.exports = WorkQueue;